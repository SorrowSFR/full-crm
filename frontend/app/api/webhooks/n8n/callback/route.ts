import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySignature } from '@/lib/hmac';
import { decrypt } from '@/lib/encryption';

const CampaignStatus = {
  WAITING_FOR_CALLBACKS: 'WAITING_FOR_CALLBACKS',
  COMPLETED: 'COMPLETED',
} as const;

const LeadStatus = {
  COMPLETED: 'COMPLETED',
} as const;

const LeadOutcomeMap: Record<string, string> = {
  qualified: 'QUALIFIED',
  site_visit_scheduled: 'SITE_VISIT_SCHEDULED',
  meeting_scheduled: 'MEETING_SCHEDULED',
  no_answer: 'NO_ANSWER',
  failed: 'FAILED',
  validation_error: 'VALIDATION_ERROR',
};

export async function POST(request: NextRequest) {
  try {
    // Get body text for signature verification
    const bodyText = await request.text();
    const callback = JSON.parse(bodyText);
    
    // Verify HMAC signature
    const signature = request.headers.get('x-signature');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET || '';
    
    if (n8nSecret && signature) {
      const isValid = verifySignature(bodyText, signature, n8nSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    const { campaign_id, lead_id, outcome, timestamp, meeting_details, site_visit_details } = callback;

    if (!campaign_id || !lead_id || !outcome || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the lead and campaign
    const lead = await prisma.lead.findFirst({
      where: {
        lead_id: lead_id,
        campaign: {
          campaign_id: campaign_id,
        },
      },
      include: { campaign: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check if already completed (idempotency)
    if (lead.status === LeadStatus.COMPLETED) {
      return NextResponse.json({
        message: 'Lead already completed',
        duplicate: true,
        existing_outcome: lead.outcome,
      });
    }

    const mappedOutcome = LeadOutcomeMap[outcome] || 'FAILED';

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { lead_id: lead_id },
      data: {
        status: LeadStatus.COMPLETED,
        outcome: mappedOutcome,
        timestamp: new Date(timestamp),
        meeting_details: meeting_details || null,
        site_visit_details: site_visit_details || null,
      },
    });

    // Check if campaign should be completed
    const remainingLeads = await prisma.lead.findMany({
      where: {
        campaign_id: campaign_id,
        status: {
          not: LeadStatus.COMPLETED,
        },
      },
    });

    if (remainingLeads.length === 0 && lead.campaign.status === CampaignStatus.WAITING_FOR_CALLBACKS) {
      await prisma.campaign.update({
        where: { campaign_id: campaign_id },
        data: {
          status: CampaignStatus.COMPLETED,
          completed_at: new Date(),
        },
      });

      // Process next queued campaign
      await processNextQueuedCampaign(lead.campaign.org_id);
    }

    return NextResponse.json({
      message: 'Callback processed successfully',
      lead: updatedLead,
    });
  } catch (error: any) {
    console.error('Webhook callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process callback' },
      { status: 500 }
    );
  }
}

async function processNextQueuedCampaign(orgId: string) {
  try {
    // Check if there's an active campaign
    const activeCampaign = await prisma.campaign.findFirst({
      where: {
        org_id: orgId,
        status: {
          in: ['RUNNING', 'WAITING_FOR_CALLBACKS'],
        },
      },
    });

    if (activeCampaign) {
      return null;
    }

    // Find the oldest queued campaign
    const queuedCampaign = await prisma.campaign.findFirst({
      where: {
        org_id: orgId,
        status: 'QUEUED',
      },
      include: {
        leads: {
          where: {
            status: 'PENDING',
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (!queuedCampaign) {
      return null;
    }

    // Update to RUNNING
    const updated = await prisma.campaign.updateMany({
      where: {
        campaign_id: queuedCampaign.campaign_id,
        status: 'QUEUED',
      },
      data: { status: 'RUNNING' },
    });

    if (updated.count === 0) {
      return null;
    }

    // Get valid leads and send webhook
    const validLeads = queuedCampaign.leads
      .filter((lead) => lead.status === 'PENDING')
      .map((lead) => ({
        name: lead.name || null,
        phone: lead.phone ? decrypt(lead.phone) : '',
        custom_fields: lead.custom_fields as any,
      }));

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || '';
    if (n8nWebhookUrl && validLeads.length > 0) {
      const dbLeads = await prisma.lead.findMany({
        where: {
          campaign_id: queuedCampaign.campaign_id,
          status: 'PENDING',
        },
        select: { lead_id: true },
        orderBy: { created_at: 'asc' },
      });

      const payload = {
        campaign_id: queuedCampaign.campaign_id,
        org_id: orgId,
        agent_reference: queuedCampaign.agent_reference,
        leads: validLeads.map((lead, index) => ({
          lead_id: dbLeads[index]?.lead_id || `temp-${index}`,
          name: lead.name || '',
          phone: lead.phone,
          custom_fields: lead.custom_fields || {},
        })),
      };

      try {
        const axios = (await import('axios')).default;
        await axios.post(n8nWebhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        await prisma.campaign.update({
          where: { campaign_id: queuedCampaign.campaign_id },
          data: { status: 'WAITING_FOR_CALLBACKS' },
        });
      } catch (error) {
        await prisma.campaign.update({
          where: { campaign_id: queuedCampaign.campaign_id },
          data: { status: 'FAILED' },
        });
      }
    }

    return queuedCampaign;
  } catch (error) {
    console.error('Error processing next queued campaign:', error);
    return null;
  }
}

