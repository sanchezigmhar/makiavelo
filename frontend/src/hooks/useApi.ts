import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { AxiosRequestConfig } from 'axios';

interface UseApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, unknown>;
  data?: unknown;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (overrides?: Partial<UseApiOptions<T>>) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = unknown>(options: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (overrides?: Partial<UseApiOptions<T>>): Promise<T | null> => {
      const opts = { ...optionsRef.current, ...overrides };

      setIsLoading(true);
      setError(null);

      try {
        const config: AxiosRequestConfig = {
          url: opts.url,
          method: opts.method || 'GET',
          params: opts.params,
          data: opts.data,
        };

        const response = await api.request<T>(config);

        if (mountedRef.current) {
          setData(response.data);
          setIsLoading(false);
          opts.onSuccess?.(response.data);
        }

        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        if (mountedRef.current) {
          setError(error);
          setIsLoading(false);
          opts.onError?.(error);
        }
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.url]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, execute, reset };
}

// Simple fetch hook
export function useFetch<T = unknown>(url: string, immediate = true) {
  return useApi<T>({ url, immediate });
}

// Mutation hook (POST/PUT/PATCH/DELETE)
export function useMutation<T = unknown, D = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data?: D): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.request<T>({
          url,
          method,
          data,
        });
        setIsLoading(false);
        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setIsLoading(false);
        return null;
      }
    },
    [url, method]
  );

  return { mutate, isLoading, error };
}
