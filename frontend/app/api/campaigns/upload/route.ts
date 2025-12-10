import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { normalizePhone, isValidPhone } from '@/lib/phone-validation';
import * as XLSX from 'xlsx';
import axios from 'axios';

const CampaignStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  WAITING_FOR_CALLBACKS: 'WAITING_FOR_CALLBACKS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

const LeadStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

const LeadOutcome = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agentReference = formData.get('agent_reference') as string;
    const columnMappingStr = formData.get('column_mapping') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!agentReference || !columnMappingStr) {
      return NextResponse.json(
        { error: 'Missing agent_reference or column_mapping' },
        { status: 400 }
      );
    }

    let columnMapping;
    try {
      columnMapping = JSON.parse(columnMappingStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid column_mapping JSON' },
        { status: 400 }
      );
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 leads allowed per upload' },
        { status: 400 }
      );
    }

    // Validate and map leads
    const validLeads: any[] = [];
    const errors: Array<{ row: number; error: string; phone?: string }> = [];
    const phoneSet = new Set<string>();

    data.forEach((row: any, index) => {
      const rowNum = index + 2;
      const phone = row[columnMapping.phone]?.toString() || '';

      if (!phone) {
        errors.push({ row: rowNum, error: 'Missing phone number' });
        return;
      }

      const normalizedPhone = normalizePhone(phone);

      if (!isValidPhone(normalizedPhone)) {
        errors.push({
          row: rowNum,
          error: 'Invalid phone format',
          phone: normalizedPhone,
        });
        return;
      }

      if (phoneSet.has(normalizedPhone)) {
        errors.push({
          row: rowNum,
          error: 'Duplicate phone number',
          phone: normalizedPhone,
        });
        return;
      }

      phoneSet.add(normalizedPhone);

      const customFields: Record<string, any> = {};
      if (columnMapping.customFields) {
        Object.entries(columnMapping.customFields).forEach(([key, value]) => {
          if (row[value as string] !== undefined) {
            customFields[key] = row[value as string];
          }
        });
      }

      validLeads.push({
        name: row[columnMapping.name] || null,
        phone: normalizedPhone,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      });
    });

    // Check for active campaign
    const activeCampaign = await prisma.campaign.findFirst({
      where: {
        org_id: user.org_id,
        status: {
          in: [CampaignStatus.RUNNING, CampaignStatus.WAITING_FOR_CALLBACKS],
        },
      },
    });

    const status = activeCampaign ? CampaignStatus.QUEUED : CampaignStatus.RUNNING;

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        org_id: user.org_id,
        agent_reference: agentReference,
        status,
      },
    });

    // Create leads
    const leadData = [
      ...validLeads.map((lead) => ({
        campaign_id: campaign.campaign_id,
        name: lead.name,
        phone: encrypt(lead.phone),
        custom_fields: lead.custom_fields,
        status: LeadStatus.PENDING,
      })),
      ...errors.map((error) => ({
        campaign_id: campaign.campaign_id,
        phone: error.phone ? encrypt(error.phone) : '',
        status: LeadStatus.VALIDATION_ERROR,
        outcome: LeadOutcome.VALIDATION_ERROR,
        error_type: error.error,
      })),
    ];

    await prisma.lead.createMany({
      data: leadData,
    });

    // If running, send webhook immediately
    if (campaign.status === CampaignStatus.RUNNING && validLeads.length > 0) {
      await sendWebhookToN8n(
        campaign.campaign_id,
        user.org_id,
        agentReference,
        validLeads
      );
    }

    return NextResponse.json({
      campaign_id: campaign.campaign_id,
      status: campaign.status,
      valid_leads: validLeads.length,
      errors: errors.length,
      validation_errors: errors,
    });
  } catch (error: any) {
    console.error('Upload campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload campaign' },
      { status: 500 }
    );
  }
}

async function sendWebhookToN8n(
  campaignId: string,
  orgId: string,
  agentReference: string,
  leads: any[]
) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
  if (!n8nWebhookUrl) return;

  // Get actual lead_ids from database
  const dbLeads = await prisma.lead.findMany({
    where: {
      campaign_id: campaignId,
      status: LeadStatus.PENDING,
    },
    select: { lead_id: true },
    orderBy: { created_at: 'asc' },
  });

  const payload = {
    campaign_id: campaignId,
    org_id: orgId,
    agent_reference: agentReference,
    leads: leads.map((lead, index) => ({
      lead_id: dbLeads[index]?.lead_id || `temp-${index}`,
      name: lead.name || '',
      phone: lead.phone,
      custom_fields: lead.custom_fields || {},
    })),
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      await axios.post(n8nWebhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      await prisma.campaign.update({
        where: { campaign_id: campaignId },
        data: { status: CampaignStatus.WAITING_FOR_CALLBACKS },
      });

      return;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        await prisma.campaign.update({
          where: { campaign_id: campaignId },
          data: { status: CampaignStatus.FAILED },
        });
        throw new Error(`Failed to send webhook after ${maxAttempts} attempts`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }
}

