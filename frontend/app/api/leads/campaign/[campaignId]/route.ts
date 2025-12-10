import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        campaign_id: params.campaignId,
        org_id: user.org_id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const leads = await prisma.lead.findMany({
      where: { campaign_id: params.campaignId },
      orderBy: { created_at: 'asc' },
    });

    // Decrypt phone numbers
    const decryptedLeads = leads.map((lead) => ({
      ...lead,
      phone: lead.phone ? decrypt(lead.phone) : '',
    }));

    return NextResponse.json(decryptedLeads);
  } catch (error: any) {
    console.error('Get leads error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get leads' },
      { status: 500 }
    );
  }
}

