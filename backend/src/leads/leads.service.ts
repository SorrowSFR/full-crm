import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../utils/encryption.util';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async getLeadsByCampaign(campaignId: string, orgId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        campaign_id: campaignId,
        org_id: orgId,
      },
    });

    if (!campaign) {
      return [];
    }

    const leads = await this.prisma.lead.findMany({
      where: { campaign_id: campaignId },
      orderBy: { created_at: 'asc' },
    });

    // Decrypt phone numbers for display
    return leads.map((lead) => ({
      ...lead,
      phone: lead.phone ? EncryptionUtil.decrypt(lead.phone) : '',
    }));
  }

  async getLead(leadId: string, orgId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        lead_id: leadId,
        campaign: {
          org_id: orgId,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!lead) {
      return null;
    }

    return {
      ...lead,
      phone: lead.phone ? EncryptionUtil.decrypt(lead.phone) : '',
    };
  }
}

