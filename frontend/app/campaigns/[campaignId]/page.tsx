'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { usePolling } from '@/hooks/use-polling';
import Link from 'next/link';

interface Lead {
  lead_id: string;
  name: string | null;
  phone: string;
  status: string;
  outcome: string | null;
  meeting_details: any;
  site_visit_details: any;
  error_type: string | null;
  timestamp: string | null;
}

interface Campaign {
  campaign_id: string;
  agent_reference: string;
  status: string;
  created_at: string;
  leads: Lead[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchCampaign();
    fetchMetrics();
  }, [campaignId]);

  // Use polling for real-time updates (replaces WebSocket)
  // Only poll if campaign is not completed
  const isActive = campaign?.status !== 'COMPLETED' && campaign?.status !== 'FAILED';
  usePolling(
    () => {
      fetchCampaign();
      fetchMetrics();
    },
    2000, // Poll every 2 seconds
    isActive ?? true
  );

  const fetchCampaign = async () => {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      console.error('Failed to fetch campaign', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await api.get(`/analytics/campaign/${campaignId}`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/analytics/export/${campaignId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign-${campaignId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'outline',
      VALIDATION_ERROR: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      QUALIFIED: 'default',
      MEETING_SCHEDULED: 'default',
      SITE_VISIT_SCHEDULED: 'default',
      NO_ANSWER: 'secondary',
      FAILED: 'destructive',
      VALIDATION_ERROR: 'destructive',
    };
    return <Badge variant={variants[outcome] || 'outline'}>{outcome}</Badge>;
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>;
  }

  if (!campaign) {
    return <div className="min-h-screen bg-gray-50 p-8">Campaign not found</div>;
  }

  const totalLeads = campaign.leads.length;
  const completedLeads = campaign.leads.filter((l) => l.status === 'COMPLETED').length;
  const progress = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/campaigns">
              <Button variant="ghost">← Back to Campaigns</Button>
            </Link>
            <h1 className="text-3xl font-bold mt-4">{campaign.agent_reference}</h1>
            <p className="text-gray-600">Created: {new Date(campaign.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={campaign.status === 'COMPLETED' ? 'outline' : 'default'}>
              {campaign.status}
            </Badge>
            <Button onClick={handleExport} variant="outline">
              Export CSV
            </Button>
          </div>
        </div>

        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Contacts</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{metrics.total_contacts}</CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{metrics.completed_contacts}</CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Qualification Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{metrics.qualification_rate?.toFixed(1)}%</CardTitle>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Answer Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">{metrics.answer_rate?.toFixed(1)}%</CardTitle>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{completedLeads} of {totalLeads} leads completed</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>{totalLeads} total leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Meeting Details</TableHead>
                    <TableHead>Site Visit Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.leads.map((lead) => (
                    <TableRow key={lead.lead_id}>
                      <TableCell>{lead.name || '-'}</TableCell>
                      <TableCell>{lead.phone}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>{getOutcomeBadge(lead.outcome)}</TableCell>
                      <TableCell>
                        {lead.meeting_details ? (
                          <div className="text-sm">
                            <div>{(lead.meeting_details as any).datetime}</div>
                            <div className="text-gray-500">{(lead.meeting_details as any).location}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.site_visit_details ? (
                          <div className="text-sm">
                            <div>{(lead.site_visit_details as any).datetime}</div>
                            <div className="text-gray-500">{(lead.site_visit_details as any).location}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

