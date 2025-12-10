import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

const LeadStatus = {
  COMPLETED: 'COMPLETED',
} as const;

const LeadOutcome = {
  QUALIFIED: 'QUALIFIED',
  SITE_VISIT_SCHEDULED: 'SITE_VISIT_SCHEDULED',
  MEETING_SCHEDULED: 'MEETING_SCHEDULED',
  NO_ANSWER: 'NO_ANSWER',
  FAILED: 'FAILED',
} as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : undefined;

    const where: any = {
      org_id: user.org_id,
    };

    if (days) {
      where.created_at = {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
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

    const answered = totalQualified + totalMeetingScheduled + totalSiteVisitScheduled;
    const answerRate = totalCalls > 0 ? (answered / totalCalls) * 100 : 0;
    const qualificationRate = totalCompleted > 0 ? (totalQualified / totalCompleted) * 100 : 0;
    const failureRate = totalCompleted > 0 ? (totalFailed / totalCompleted) * 100 : 0;

    return NextResponse.json({
      total_calls: totalCalls,
      answer_rate: Math.round(answerRate * 100) / 100,
      qualification_rate: Math.round(qualificationRate * 100) / 100,
      meeting_scheduled_count: totalMeetingScheduled,
      site_visit_scheduled_count: totalSiteVisitScheduled,
      failure_rate: Math.round(failureRate * 100) / 100,
    });
  } catch (error: any) {
    console.error('Get org analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

