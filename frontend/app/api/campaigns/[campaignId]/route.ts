import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign' },
      { status: 500 }
    );
  }
}

