import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

export const useWebSocket = (onLeadUpdate?: (data: any) => void, onCampaignProgress?: (data: any) => void, onCampaignCompleted?: (data: any) => void) => {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({ onLeadUpdate, onCampaignProgress, onCampaignCompleted });
  const { token } = useAuthStore();

  // Update callbacks ref without triggering re-render
  useEffect(() => {
    callbacksRef.current = { onLeadUpdate, onCampaignProgress, onCampaignCompleted };
  }, [onLeadUpdate, onCampaignProgress, onCampaignCompleted]);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Use ref to access latest callbacks without re-creating socket
    const handleLeadUpdate = (data: any) => {
      callbacksRef.current.onLeadUpdate?.(data);
    };

    const handleCampaignProgress = (data: any) => {
      callbacksRef.current.onCampaignProgress?.(data);
    };

    const handleCampaignCompleted = (data: any) => {
      callbacksRef.current.onCampaignCompleted?.(data);
    };

    socket.on('lead.updated', handleLeadUpdate);
    socket.on('campaign.progress', handleCampaignProgress);
    socket.on('campaign.completed', handleCampaignCompleted);

    return () => {
      socket.off('lead.updated', handleLeadUpdate);
      socket.off('campaign.progress', handleCampaignProgress);
      socket.off('campaign.completed', handleCampaignCompleted);
      socket.disconnect();
    };
  }, [token]); // Only depend on token, not callbacks

  return socketRef.current;
};

