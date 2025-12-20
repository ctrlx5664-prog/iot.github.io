import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import type { DeviceUpdateMessage } from '@shared/schema';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Netlify Functions (and most serverless platforms) don't support long-lived WebSockets.
    // Keep WS enabled by default only in dev, and allow overriding via VITE_ENABLE_WS.
    const enabled =
      (import.meta.env.VITE_ENABLE_WS as unknown as string | undefined) !== undefined
        ? (import.meta.env.VITE_ENABLE_WS as unknown as string) === "true"
        : import.meta.env.DEV;

    if (!enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: DeviceUpdateMessage = JSON.parse(event.data);
          
          // Invalidate queries to trigger refetch
          if (message.type === 'light_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/lights'] });
          } else if (message.type === 'tv_update') {
            queryClient.invalidateQueries({ queryKey: ['/api/tvs'] });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return wsRef;
}
