import { Controller, Get, Query, Param, Res, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('campaign/:campaignId')
  async getCampaignMetrics(@Request() req, @Param('campaignId') campaignId: string) {
    return this.analyticsService.getCampaignMetrics(campaignId, req.user.org_id);
  }

  @Get('org')
  async getOrgMetrics(
    @Request() req,
    @Query('campaign_id') campaignId?: string,
    @Query('days') days?: string,
  ) {
    const filters: any = {};
    if (campaignId) filters.campaignId = campaignId;
    if (days) filters.days = parseInt(days);

    return this.analyticsService.getOrgMetrics(req.user.org_id, filters);
  }

  @Get('export/:campaignId')
  async exportCampaign(@Request() req, @Param('campaignId') campaignId: string, @Res() res: Response) {
    const csvBuffer = await this.analyticsService.exportCampaignToCSV(campaignId, req.user.org_id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaignId}.csv`);
    res.send(csvBuffer);
  }
}

