import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../utils/encryption.util';
import { LeadOutcome, LeadStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getCampaignMetrics(campaignId: string, orgId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        campaign_id: campaignId,
        org_id: orgId,
      },
      include: {
        leads: true,
      },
    });

    if (!campaign) {
      return null;
    }

    const leads = campaign.leads;
    const total = leads.length;
    const completed = leads.filter((l) => l.status === LeadStatus.COMPLETED).length;
    const pending = leads.filter((l) => l.status === LeadStatus.PENDING).length;
    const inProgress = leads.filter((l) => l.status === LeadStatus.IN_PROGRESS).length;

    const qualified = leads.filter((l) => l.outcome === LeadOutcome.QUALIFIED).length;
    const meetingScheduled = leads.filter((l) => l.outcome === LeadOutcome.MEETING_SCHEDULED).length;
    const siteVisitScheduled = leads.filter((l) => l.outcome === LeadOutcome.SITE_VISIT_SCHEDULED).length;
    const noAnswer = leads.filter((l) => l.outcome === LeadOutcome.NO_ANSWER).length;
    const failed = leads.filter((l) => l.outcome === LeadOutcome.FAILED).length;

    // Calculate answered calls directly by counting successful outcomes
    // This ensures accuracy regardless of data state variations
    const answered = qualified + meetingScheduled + siteVisitScheduled;
    const answerRate = total > 0 ? (answered / total) * 100 : 0;
    const qualificationRate = completed > 0 ? (qualified / completed) * 100 : 0;
    const failureRate = completed > 0 ? (failed / completed) * 100 : 0;

    return {
      campaign_id: campaign.campaign_id,
      status: campaign.status,
      total_contacts: total,
      completed_contacts: completed,
      pending_contacts: pending,
      in_progress_contacts: inProgress,
      qualified_count: qualified,
      meeting_scheduled_count: meetingScheduled,
      site_visit_scheduled_count: siteVisitScheduled,
      no_answer_count: noAnswer,
      failed_count: failed,
      answer_rate: Math.round(answerRate * 100) / 100,
      qualification_rate: Math.round(qualificationRate * 100) / 100,
      failure_rate: Math.round(failureRate * 100) / 100,
    };
  }

  async getOrgMetrics(orgId: string, filters?: { campaignId?: string; days?: number }) {
    const where: any = {
      org_id: orgId,
    };

    if (filters?.campaignId) {
      where.campaign_id = filters.campaignId;
    }

    if (filters?.days) {
      const date = new Date();
      date.setDate(date.getDate() - filters.days);
      where.created_at = { gte: date };
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        org_id: orgId,
        ...(filters?.campaignId && { campaign_id: filters.campaignId }),
        ...(filters?.days && {
          created_at: {
            gte: new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000),
          },
        }),
      },
      include: {
        leads: true,
      },
    });

    let totalCalls = 0;
    let totalCompleted = 0;
    let totalQualified = 0;
    let totalMeetingScheduled = 0;
    let totalSiteVisitScheduled = 0;
    let totalNoAnswer = 0;
    let totalFailed = 0;

    campaigns.forEach((campaign) => {
      const leads = campaign.leads;
      totalCalls += leads.length;
      totalCompleted += leads.filter((l) => l.status === LeadStatus.COMPLETED).length;
      totalQualified += leads.filter((l) => l.outcome === LeadOutcome.QUALIFIED).length;
      totalMeetingScheduled += leads.filter((l) => l.outcome === LeadOutcome.MEETING_SCHEDULED).length;
      totalSiteVisitScheduled += leads.filter((l) => l.outcome === LeadOutcome.SITE_VISIT_SCHEDULED).length;
      totalNoAnswer += leads.filter((l) => l.outcome === LeadOutcome.NO_ANSWER).length;
      totalFailed += leads.filter((l) => l.outcome === LeadOutcome.FAILED).length;
    });

    // Calculate answered calls directly by counting successful outcomes
    // This ensures accuracy regardless of data state variations
    const answered = totalQualified + totalMeetingScheduled + totalSiteVisitScheduled;
    const answerRate = totalCalls > 0 ? (answered / totalCalls) * 100 : 0;
    const qualificationRate = totalCompleted > 0 ? (totalQualified / totalCompleted) * 100 : 0;
    const failureRate = totalCompleted > 0 ? (totalFailed / totalCompleted) * 100 : 0;

    return {
      total_calls: totalCalls,
      answer_rate: Math.round(answerRate * 100) / 100,
      qualification_rate: Math.round(qualificationRate * 100) / 100,
      meeting_scheduled_count: totalMeetingScheduled,
      site_visit_scheduled_count: totalSiteVisitScheduled,
      failure_rate: Math.round(failureRate * 100) / 100,
    };
  }

  async exportCampaignToCSV(campaignId: string, orgId: string): Promise<Buffer> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        campaign_id: campaignId,
        org_id: orgId,
      },
      include: {
        leads: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Prepare data for CSV
    const rows = campaign.leads.map((lead) => {
      const phone = lead.phone ? EncryptionUtil.decrypt(lead.phone) : '';
      
      return {
        name: lead.name || '',
        phone: phone,
        outcome: lead.outcome || '',
        call_timestamp: lead.timestamp ? lead.timestamp.toISOString() : '',
        meeting_datetime: lead.meeting_details ? (lead.meeting_details as any).datetime || '' : '',
        meeting_location: lead.meeting_details ? (lead.meeting_details as any).location || '' : '',
        site_visit_datetime: lead.site_visit_details ? (lead.site_visit_details as any).datetime || '' : '',
        site_visit_location: lead.site_visit_details ? (lead.site_visit_details as any).location || '' : '',
        custom_fields: lead.custom_fields ? JSON.stringify(lead.custom_fields) : '',
        campaign_id: campaign.campaign_id,
        tags: lead.tags ? JSON.stringify(lead.tags) : '',
        error_type: lead.error_type || '',
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Convert to CSV string first (CSV is text-based, not binary)
    const csvString = XLSX.write(workbook, { type: 'string', bookType: 'csv' });
    // Then convert to buffer
    return Buffer.from(csvString, 'utf-8');
  }
}

