import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {
    const host = this.configService.get('REDIS_HOST') || 'localhost';
    const port = parseInt(this.configService.get('REDIS_PORT') || '6379');
    const password = this.configService.get('REDIS_PASSWORD') || undefined;

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // Handle connection errors gracefully
    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
      // Don't crash the app, just log the error
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      // Don't throw - allow app to start without Redis (some features may not work)
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        this.logger.error(`Error closing Redis connection: ${error.message}`);
      }
    }
  }

  getClient(): Redis {
    return this.client;
  }
}

