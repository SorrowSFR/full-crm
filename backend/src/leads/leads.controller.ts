import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get('campaign/:campaignId')
  async getLeadsByCampaign(@Request() req, @Param('campaignId') campaignId: string) {
    return this.leadsService.getLeadsByCampaign(campaignId, req.user.org_id);
  }

  @Get(':leadId')
  async getLead(@Request() req, @Param('leadId') leadId: string) {
    return this.leadsService.getLead(leadId, req.user.org_id);
  }
}

