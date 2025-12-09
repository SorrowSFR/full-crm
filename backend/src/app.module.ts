import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LeadsModule } from './leads/leads.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    HealthModule,
    AuthModule,
    CampaignsModule,
    LeadsModule,
    WebhooksModule,
    WebSocketModule,
    AnalyticsModule,
  ],
})
export class AppModule {}

