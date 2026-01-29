// Custom hook for polling with automatic cleanup

import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePollingOptions<T> {
  interval: number; // milliseconds
  shouldStop?: (data: T) => boolean;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UsePollingReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for polling API endpoints
 * Automatically stops when shouldStop returns true
 * Cleans up interval on unmount
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions<T>
): UsePollingReturn<T> {
  const {
    interval,
    shouldStop,
    onError,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef<boolean>(true);

  const poll = useCallback(async () => {
    try {
      const result = await fetchFn();
      
      if (!isMountedRef.current) return;
      
      setData(result);
      setError(null);
      setIsLoading(false);

      // Check if we should stop polling
      if (shouldStop && shouldStop(result)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsLoading(false);
      
      if (onError) {
        onError(error);
      }
    }
  }, [fetchFn, shouldStop, onError]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await poll();
  }, [poll]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    poll();

    // Start polling interval
    intervalRef.current = setInterval(poll, interval);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, poll]);

  return { data, error, isLoading, refetch };
}