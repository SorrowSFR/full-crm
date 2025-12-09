import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignStatus } from '@prisma/client';

@Processor('campaigns')
export class CampaignsProcessor extends WorkerHost {
  constructor(
    private campaignsService: CampaignsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    const { campaign_id, org_id, agent_reference, leads } = job.data;
    
    // Check if campaign still exists and is queued
    const campaign = await this.prisma.campaign.findUnique({
      where: { campaign_id },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaign_id} not found`);
    }

    // If campaign is no longer queued, skip processing
    if (campaign.status !== CampaignStatus.QUEUED) {
      console.log(`Campaign ${campaign_id} is no longer queued (status: ${campaign.status}), skipping`);
      return;
    }

    // Check if there's still an active campaign
    const activeCampaign = await this.prisma.campaign.findFirst({
      where: {
        org_id,
        status: {
          in: [CampaignStatus.RUNNING, CampaignStatus.WAITING_FOR_CALLBACKS],
        },
        NOT: {
          campaign_id: campaign_id, // Exclude current campaign
        },
      },
    });

    // If there's an active campaign, throw error to trigger retry with backoff
    // BullMQ will automatically retry based on the backoff configuration set when adding the job
    // This ensures the job will be retried periodically until the active campaign completes
    if (activeCampaign) {
      throw new Error(`Campaign still queued - another campaign (${activeCampaign.campaign_id}) is active. Will retry with exponential backoff.`);
    }

    // No active campaign, start this one
    await this.campaignsService.sendWebhookToN8n(campaign_id, org_id, agent_reference, leads);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Campaign job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`Campaign job ${job.id} failed:`, error.message);
  }
}

