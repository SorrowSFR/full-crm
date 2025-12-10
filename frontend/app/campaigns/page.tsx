'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import Link from 'next/link';

interface Campaign {
  campaign_id: string;
  agent_reference: string;
  status: string;
  created_at: string;
  leads: Array<{ lead_id: string; status: string; outcome: string | null }>;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      QUEUED: 'secondary',
      RUNNING: 'default',
      WAITING_FOR_CALLBACKS: 'default',
      COMPLETED: 'outline',
      FAILED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Link href="/campaigns/new">
            <Button>New Campaign</Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No campaigns yet. Create your first campaign to get started.</p>
                <Link href="/campaigns/new">
                  <Button className="mt-4">Create Campaign</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const totalLeads = campaign.leads.length;
              const completedLeads = campaign.leads.filter((l) => l.status === 'COMPLETED').length;
              const progress = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

              return (
                <Card key={campaign.campaign_id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{campaign.agent_reference}</CardTitle>
                        <CardDescription>
                          Created: {new Date(campaign.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>
                            {completedLeads} / {totalLeads} leads
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <Link href={`/campaigns/${campaign.campaign_id}`}>
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

