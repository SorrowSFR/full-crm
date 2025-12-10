'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<string>('30');

  useEffect(() => {
    fetchMetrics();
  }, [timeFilter]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/analytics/org', {
        params: { days: timeFilter },
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {metrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Calls</CardTitle>
                <CardDescription>All campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.total_calls}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Answer Rate</CardTitle>
                <CardDescription>Percentage of answered calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.answer_rate?.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Qualification Rate</CardTitle>
                <CardDescription>Percentage of qualified leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.qualification_rate?.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meetings Scheduled</CardTitle>
                <CardDescription>Total meetings scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.meeting_scheduled_count}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Site Visits Scheduled</CardTitle>
                <CardDescription>Total site visits scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.site_visit_scheduled_count}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Failure Rate</CardTitle>
                <CardDescription>Percentage of failed calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.failure_rate?.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

