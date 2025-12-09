import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket as SocketIO } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private orgClients = new Map<string, Set<string>>(); // org_id -> Set of socket_ids

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: SocketIO) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const orgId = payload.org_id;

      if (!orgId) {
        client.disconnect();
        return;
      }

      // Store org_id in socket data
      client.data.org_id = orgId;

      // Track client for this org
      if (!this.orgClients.has(orgId)) {
        this.orgClients.set(orgId, new Set());
      }
      this.orgClients.get(orgId)!.add(client.id);

      client.join(`org:${orgId}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: SocketIO) {
    const orgId = client.data.org_id;
    if (orgId && this.orgClients.has(orgId)) {
      this.orgClients.get(orgId)!.delete(client.id);
      if (this.orgClients.get(orgId)!.size === 0) {
        this.orgClients.delete(orgId);
      }
    }
  }

  emitLeadUpdate(orgId: string, data: any) {
    this.server.to(`org:${orgId}`).emit('lead.updated', data);
  }

  emitCampaignProgress(orgId: string, campaignId: string, progress: any) {
    this.server.to(`org:${orgId}`).emit('campaign.progress', {
      campaign_id: campaignId,
      ...progress,
    });
  }

  emitCampaignCompleted(orgId: string, campaignId: string) {
    this.server.to(`org:${orgId}`).emit('campaign.completed', {
      campaign_id: campaignId,
    });
  }

  @SubscribeMessage('subscribe:campaign')
  handleSubscribeCampaign(client: SocketIO, payload: { campaign_id: string }) {
    const orgId = client.data.org_id;
    if (orgId) {
      client.join(`campaign:${payload.campaign_id}`);
    }
  }
}

