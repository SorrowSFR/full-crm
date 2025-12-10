import { useEffect, useRef } from 'react';

/**
 * Polling hook to replace WebSocket for real-time updates
 * Polls the API at specified intervals
 */
export function usePolling(
  callback: () => void | Promise<void>,
  interval: number = 2000, // 2 seconds default
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref without triggering re-render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial call
    callbackRef.current();

    // Set up polling
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval]);
}

