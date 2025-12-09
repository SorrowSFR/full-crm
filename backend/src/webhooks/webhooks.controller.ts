import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { N8nCallbackDto } from './dto/n8n-callback.dto';
import { HmacUtil } from '../utils/hmac.util';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly webhookSecret: string;

  constructor(
    private webhooksService: WebhooksService,
    private prisma: PrismaService,
  ) {
    this.webhookSecret = process.env.N8N_WEBHOOK_SECRET || '';
  }

  @Post('n8n/callback')
  async handleN8nCallback(
    @Body() body: N8nCallbackDto,
    @Headers('x-signature') signature: string,
  ) {
    // Verify HMAC signature
    const payload = JSON.stringify(body);
    if (!HmacUtil.verifySignature(payload, signature, this.webhookSecret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Extract org_id from campaign (for security)
    const campaign = await this.prisma.campaign.findUnique({
      where: { campaign_id: body.campaign_id },
      select: { org_id: true },
    });

    if (!campaign) {
      throw new UnauthorizedException('Campaign not found');
    }

    return this.webhooksService.handleN8nCallback(body, campaign.org_id);
  }
}

