import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../utils/encryption.util';
import { PhoneValidationUtil } from '../utils/phone-validation.util';
import { CampaignStatus, LeadStatus, LeadOutcome } from '@prisma/client';
import * as XLSX from 'xlsx';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import axios from 'axios';

@Injectable()
export class CampaignsService {
  private readonly n8nWebhookUrl: string;
  private readonly n8nWebhookSecret: string;

  constructor(
    private prisma: PrismaService,
    @InjectQueue('campaigns') private campaignQueue: Queue,
  ) {
    this.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
    this.n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET || '';
  }

  async parseExcelFile(file: Express.Multer.File): Promise<any[]> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  async validateAndMapLeads(
    data: any[],
    columnMapping: any,
    orgId: string,
  ): Promise<{
    validLeads: any[];
    errors: Array<{ row: number; error: string; phone?: string }>;
  }> {
    const validLeads: any[] = [];
    const errors: Array<{ row: number; error: string; phone?: string }> = [];
    const phoneSet = new Set<string>();

    if (data.length > 500) {
      throw new BadRequestException('Maximum 500 leads allowed per upload');
    }

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index is 0-based and Excel rows start at 1, plus header
      const phone = row[columnMapping.phone]?.toString() || '';

      // Check for missing phone
      if (!phone) {
        errors.push({
          row: rowNum,
          error: 'Missing phone number',
        });
        return;
      }

      const normalizedPhone = PhoneValidationUtil.normalizePhone(phone);

      // Check for invalid phone format
      if (!PhoneValidationUtil.isValidPhone(normalizedPhone)) {
        errors.push({
          row: rowNum,
          error: 'Invalid phone format',
          phone: normalizedPhone,
        });
        return;
      }

      // Check for duplicates
      if (phoneSet.has(normalizedPhone)) {
        errors.push({
          row: rowNum,
          error: 'Duplicate phone number',
          phone: normalizedPhone,
        });
        return;
      }

      phoneSet.add(normalizedPhone);

      // Build custom fields
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

    return { validLeads, errors };
  }

  async createCampaign(
    orgId: string,
    agentReference: string,
    validLeads: any[],
    errors: any[],
  ) {
    // Use transaction to atomically check for active campaign and create new one
    // This prevents race conditions where multiple campaigns could be set to RUNNING
    const campaign = await this.prisma.$transaction(async (tx) => {
      // Check if there's an active campaign (within transaction)
      const activeCampaign = await tx.campaign.findFirst({
        where: {
          org_id: orgId,
          status: {
            in: [CampaignStatus.RUNNING, CampaignStatus.WAITING_FOR_CALLBACKS],
          },
        },
      });

      const status = activeCampaign ? CampaignStatus.QUEUED : CampaignStatus.RUNNING;

      // Create campaign atomically
      return await tx.campaign.create({
        data: {
          org_id: orgId,
          agent_reference: agentReference,
          status,
        },
      });
    });

    // Create leads (including validation errors)
    const leadData = [
      ...validLeads.map((lead) => ({
        campaign_id: campaign.campaign_id,
        name: lead.name,
        phone: EncryptionUtil.encrypt(lead.phone),
        custom_fields: lead.custom_fields,
        status: LeadStatus.PENDING,
      })),
      ...errors.map((error) => ({
        campaign_id: campaign.campaign_id,
        phone: error.phone ? EncryptionUtil.encrypt(error.phone) : '',
        status: LeadStatus.VALIDATION_ERROR,
        outcome: LeadOutcome.VALIDATION_ERROR,
        error_type: error.error,
      })),
    ];

    await this.prisma.lead.createMany({
      data: leadData,
    });

    // If campaign is running, send webhook immediately
    // Use campaign.status instead of the local status variable (which is out of scope)
    if (campaign.status === CampaignStatus.RUNNING) {
      await this.sendWebhookToN8n(campaign.campaign_id, orgId, agentReference, validLeads);
    } else {
      // Queue the campaign with retry configuration
      await this.campaignQueue.add(
        'process-campaign',
        {
          campaign_id: campaign.campaign_id,
          org_id: orgId,
          agent_reference: agentReference,
          leads: validLeads,
        },
        {
          attempts: 10, // Allow up to 10 attempts
          backoff: {
            type: 'exponential',
            delay: 30000, // Start with 30 second delay
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      );
    }

    return campaign;
  }

  async sendWebhookToN8n(
    campaignId: string,
    orgId: string,
    agentReference: string,
    leads: any[],
  ) {
    const payload = {
      campaign_id: campaignId,
      org_id: orgId,
      agent_reference: agentReference,
      leads: leads.map((lead, index) => ({
        lead_id: `temp-${index}`, // Will be replaced with actual lead_id after creation
        name: lead.name || '',
        phone: lead.phone,
        custom_fields: lead.custom_fields || {},
      })),
    };

    // Get actual lead_ids from database
    const dbLeads = await this.prisma.lead.findMany({
      where: {
        campaign_id: campaignId,
        status: LeadStatus.PENDING,
      },
      select: { lead_id: true },
      orderBy: { created_at: 'asc' },
    });

    // Update payload with actual lead_ids
    payload.leads = payload.leads.map((lead, index) => ({
      ...lead,
      lead_id: dbLeads[index]?.lead_id || lead.lead_id,
    }));

    // Send webhook with retry logic
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await axios.post(this.n8nWebhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        // Update campaign status
        await this.prisma.campaign.update({
          where: { campaign_id: campaignId },
          data: { status: CampaignStatus.WAITING_FOR_CALLBACKS },
        });

        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          await this.prisma.campaign.update({
            where: { campaign_id: campaignId },
            data: { status: CampaignStatus.FAILED },
          });
          throw new Error(`Failed to send webhook after ${maxAttempts} attempts`);
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  async getCampaigns(orgId: string) {
    return this.prisma.campaign.findMany({
      where: { org_id: orgId },
      include: {
        leads: {
          select: {
            lead_id: true,
            status: true,
            outcome: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getCampaign(campaignId: string, orgId: string) {
    return this.prisma.campaign.findFirst({
      where: {
        campaign_id: campaignId,
        org_id: orgId,
      },
      include: {
        leads: true,
      },
    });
  }

  /**
   * Process the next queued campaign for an organization
   * Called when an active campaign completes
   * Uses atomic transaction to prevent race conditions
   */
  async processNextQueuedCampaign(orgId: string) {
    // Use transaction to atomically check for active campaigns and update queued one
    // This prevents race conditions where multiple processes could start campaigns simultaneously
    const result = await this.prisma.$transaction(async (tx) => {
      // Check if there's an active campaign (within transaction for consistency)
      const activeCampaign = await tx.campaign.findFirst({
        where: {
          org_id: orgId,
          status: {
            in: [CampaignStatus.RUNNING, CampaignStatus.WAITING_FOR_CALLBACKS],
          },
        },
      });

      if (activeCampaign) {
        // Still have an active campaign, don't process yet
        return null;
      }

      // Find the oldest queued campaign for this org (within transaction)
      const queuedCampaign = await tx.campaign.findFirst({
        where: {
          org_id: orgId,
          status: CampaignStatus.QUEUED,
        },
        include: {
          leads: {
            where: {
              status: LeadStatus.PENDING,
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      if (!queuedCampaign) {
        return null; // No queued campaigns
      }

      // Atomically update campaign status to RUNNING (only if still QUEUED)
      // This ensures no other process can update it simultaneously
      const updatedCampaign = await tx.campaign.updateMany({
        where: {
          campaign_id: queuedCampaign.campaign_id,
          status: CampaignStatus.QUEUED, // Only update if still queued
        },
        data: { status: CampaignStatus.RUNNING },
      });

      // If update didn't affect any rows, another process already started it
      if (updatedCampaign.count === 0) {
        return null;
      }

      // Get valid leads (not validation errors)
      const validLeads = queuedCampaign.leads
        .filter((lead) => lead.status === LeadStatus.PENDING)
        .map((lead) => ({
          name: lead.name || null,
          phone: lead.phone ? EncryptionUtil.decrypt(lead.phone) : '',
          custom_fields: lead.custom_fields as any,
        }));

      // Return campaign data for webhook call outside transaction
      return { campaign: queuedCampaign, validLeads };
    });

    // Send webhook to n8n outside transaction to avoid long-running transaction
    // The campaign status is already updated atomically above
    if (result) {
      await this.sendWebhookToN8n(
        result.campaign.campaign_id,
        orgId,
        result.campaign.agent_reference,
        result.validLeads,
      );
      return result.campaign;
    }

    return null;
  }
}

