import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nCallbackDto } from './dto/n8n-callback.dto';
import { LeadStatus, LeadOutcome, CampaignStatus } from '@prisma/client';
import { EncryptionUtil } from '../utils/encryption.util';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { CampaignsService } from '../campaigns/campaigns.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WebhooksService {
  private readonly IDEMPOTENCY_KEY_TTL = 86400; // 24 hours in seconds

  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebSocketGateway,
    private campaignsService: CampaignsService,
    private redisService: RedisService,
  ) {}

  async handleN8nCallback(callback: N8nCallbackDto, orgId: string) {
    // Generate idempotency key
    const callbackKey = `callback:${callback.campaign_id}:${callback.lead_id}:${callback.timestamp}`;
    
    // Check Redis for idempotency (works across restarts and clusters)
    const redis = this.redisService.getClient();
    const existingCallback = await redis.get(callbackKey);
    if (existingCallback) {
      return { message: 'Callback already processed', duplicate: true };
    }

    // Find the lead
    const lead = await this.prisma.lead.findFirst({
      where: {
        lead_id: callback.lead_id,
        campaign: {
          campaign_id: callback.campaign_id,
          org_id: orgId,
        },
      },
      include: { campaign: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Critical safeguard: Check if lead is already COMPLETED to prevent double-processing
    // This protects against duplicate callbacks that bypass Redis cache
    if (lead.status === LeadStatus.COMPLETED) {
      // Lead already processed, mark callback as seen and return
      await redis.setex(callbackKey, this.IDEMPOTENCY_KEY_TTL, '1');
      return { 
        message: 'Lead already completed', 
        duplicate: true,
        existing_outcome: lead.outcome,
      };
    }

    // Map outcome enum
    const outcomeMap: Record<string, LeadOutcome> = {
      qualified: LeadOutcome.QUALIFIED,
      site_visit_scheduled: LeadOutcome.SITE_VISIT_SCHEDULED,
      meeting_scheduled: LeadOutcome.MEETING_SCHEDULED,
      no_answer: LeadOutcome.NO_ANSWER,
      failed: LeadOutcome.FAILED,
      validation_error: LeadOutcome.VALIDATION_ERROR,
    };

    const mappedOutcome = outcomeMap[callback.outcome] || LeadOutcome.FAILED;

    // Update lead
    const updatedLead = await this.prisma.lead.update({
      where: { lead_id: callback.lead_id },
      data: {
        status: LeadStatus.COMPLETED,
        outcome: mappedOutcome,
        timestamp: new Date(callback.timestamp),
        meeting_details: callback.meeting_details || null,
        site_visit_details: callback.site_visit_details || null,
      },
    });

    // Mark callback as processed in Redis (with TTL to prevent unbounded growth)
    // This works across service restarts and clustered deployments
    await redis.setex(callbackKey, this.IDEMPOTENCY_KEY_TTL, '1');

    // Check if campaign should be completed
    await this.checkCampaignCompletion(callback.campaign_id);

    // Emit WebSocket event
    this.websocketGateway.emitLeadUpdate(orgId, {
      campaign_id: callback.campaign_id,
      lead_id: callback.lead_id,
      status: updatedLead.status,
      outcome: updatedLead.outcome,
      meeting_details: updatedLead.meeting_details,
      site_visit_details: updatedLead.site_visit_details,
    });

    return { message: 'Callback processed successfully', lead: updatedLead };
  }

  private async checkCampaignCompletion(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { campaign_id: campaignId },
      include: {
        leads: {
          where: {
            status: {
              not: LeadStatus.COMPLETED,
            },
          },
        },
      },
    });

    if (!campaign) return;

    // If all leads are completed, mark campaign as completed
    if (campaign.leads.length === 0 && campaign.status === CampaignStatus.WAITING_FOR_CALLBACKS) {
      await this.prisma.campaign.update({
        where: { campaign_id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completed_at: new Date(),
        },
      });

      this.websocketGateway.emitCampaignCompleted(campaign.org_id, campaignId);

      // Process the next queued campaign for this organization
      try {
        await this.campaignsService.processNextQueuedCampaign(campaign.org_id);
      } catch (error) {
        console.error('Error processing next queued campaign:', error);
        // Don't fail the callback if processing next campaign fails
      }
    }
  }
}

