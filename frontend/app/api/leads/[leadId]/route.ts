import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        lead_id: params.leadId,
        campaign: {
          org_id: user.org_id,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      phone: lead.phone ? decrypt(lead.phone) : '',
    });
  } catch (error: any) {
    console.error('Get lead error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get lead' },
      { status: 500 }
    );
  }
}

