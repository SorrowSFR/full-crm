import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/upload-excel.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { agent_reference: string; column_mapping: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const orgId = req.user.org_id;
    let columnMapping;
    try {
      columnMapping = JSON.parse(body.column_mapping);
    } catch {
      throw new BadRequestException('Invalid column_mapping JSON');
    }

    // Parse Excel file
    const data = await this.campaignsService.parseExcelFile(file);

    // Validate and map leads
    const { validLeads, errors } = await this.campaignsService.validateAndMapLeads(
      data,
      columnMapping,
      orgId,
    );

    // Create campaign
    const campaign = await this.campaignsService.createCampaign(
      orgId,
      body.agent_reference,
      validLeads,
      errors,
    );

    return {
      campaign_id: campaign.campaign_id,
      status: campaign.status,
      valid_leads: validLeads.length,
      errors: errors.length,
      validation_errors: errors,
    };
  }

  @Get()
  async getCampaigns(@Request() req) {
    return this.campaignsService.getCampaigns(req.user.org_id);
  }

  @Get(':campaignId')
  async getCampaign(@Request() req, @Param('campaignId') campaignId: string) {
    return this.campaignsService.getCampaign(campaignId, req.user.org_id);
  }
}

