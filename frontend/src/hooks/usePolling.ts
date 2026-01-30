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

  //const intervalRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const isMountedRef = useRef<boolean>(true);

  // Store fetchFn in ref to avoid effect re-runs when it changes
  const fetchFnRef = useRef(fetchFn);

  // Store callbacks in refs to avoid effect re-runs
  const shouldStopRef = useRef(shouldStop);
  const onErrorRef = useRef(onError);

  // Update refs when props change
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    shouldStopRef.current = shouldStop;
  }, [shouldStop]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (fetchFnRef.current) {
      try {
        const result = await fetchFnRef.current();
        if (isMountedRef.current) {
          setData(result);
          setIsLoading(false);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        if (isMountedRef.current) setError(error);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Create stable poll function inside effect
    const stablePoll = async () => {
      try {
        // Use ref to call function
        const result = await fetchFnRef.current();

        if (!isMountedRef.current) return;

        setData(result);
        setError(null);
        setIsLoading(false);

        // Check if we should stop polling using ref
        if (shouldStopRef.current && shouldStopRef.current(result)) {
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

        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      }
    };

    // Initial fetch
    stablePoll();

    // Start polling interval
    intervalRef.current = setInterval(stablePoll, interval);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [enabled, interval]); // Removed fetchFn from dependencies!

  return { data, error, isLoading, refetch };
}