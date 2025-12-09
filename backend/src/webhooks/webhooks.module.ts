import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [WebSocketModule, CampaignsModule, RedisModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

