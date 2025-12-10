import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import * as XLSX from 'xlsx';

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
        leads: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Prepare data for CSV
    const rows = campaign.leads.map((lead) => {
      const phone = lead.phone ? decrypt(lead.phone) : '';
      
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

    // Convert to CSV
    const csvString = XLSX.write(workbook, { type: 'string', bookType: 'csv' });
    const buffer = Buffer.from(csvString, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign-${params.campaignId}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export campaign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export campaign' },
      { status: 500 }
    );
  }
}

