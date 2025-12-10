import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { org_id: user.org_id },
      include: {
        leads: {
          select: {
            lead_id: true,
            status: true,
            outcome: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get campaigns' },
      { status: 500 }
    );
  }
}

