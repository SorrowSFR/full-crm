import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

const LeadStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

const LeadOutcome = {
  QUALIFIED: 'QUALIFIED',
  SITE_VISIT_SCHEDULED: 'SITE_VISIT_SCHEDULED',
  MEETING_SCHEDULED: 'MEETING_SCHEDULED',
  NO_ANSWER: 'NO_ANSWER',
  FAILED: 'FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = await params;
    const campaign = await prisma.campaign.findFirst({
      where: {
        campaign_id: campaignId,
        org_id: user.org_id,
      },
      include: {
        leads: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
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

    const answered = qualified + meetingScheduled + siteVisitScheduled;
    const answerRate = total > 0 ? (answered / total) * 100 : 0;
    const qualificationRate = completed > 0 ? (qualified / completed) * 100 : 0;
    const failureRate = completed > 0 ? (failed / completed) * 100 : 0;

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Get campaign analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

