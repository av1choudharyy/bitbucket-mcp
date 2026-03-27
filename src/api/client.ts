import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { Config } from '../config/index';
import type { PaginatedResponse } from './types';

export type ApiClient = AxiosInstance;

export function createClient(config: Config): ApiClient {
  const instance = axios.create({
    baseURL: config.apiUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30000,
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as Record<string, unknown> | undefined;
      const message =
        (data?.error as { message?: string } | undefined)?.message ??
        (data?.message as string | undefined) ??
        error.message;

      if (status === 401) {
        throw new Error(`Bitbucket authentication failed. Check your BITBUCKET_TOKEN. (${message})`);
      }
      if (status === 403) {
        throw new Error(`Bitbucket permission denied. Token may lack required scopes. (${message})`);
      }
      if (status === 404) {
        throw new Error(`Bitbucket resource not found: ${error.config?.url}. (${message})`);
      }
      if (status === 409) {
        throw new Error(`Bitbucket conflict: ${message}`);
      }
      throw new Error(`Bitbucket API error ${status ?? 'unknown'}: ${message}`);
    },
  );

  return instance;
}

export async function paginateAll<T>(
  client: ApiClient,
  path: string,
  params: Record<string, unknown> = {},
  maxPages = 20,
): Promise<T[]> {
  const results: T[] = [];
  let currentPath: string | undefined = path;
  let pagesFetched = 0;

  while (currentPath && pagesFetched < maxPages) {
    const response: Awaited<ReturnType<typeof client.get<PaginatedResponse<T>>>> = await client.get<PaginatedResponse<T>>(currentPath, {
      params: pagesFetched === 0 ? params : undefined,
    });
    results.push(...response.data.values);

    if (response.data.next) {
      // next is an absolute URL — extract path+query to avoid baseURL concatenation
      const nextUrl: URL = new URL(response.data.next);
      currentPath = nextUrl.pathname + nextUrl.search;
    } else {
      currentPath = undefined;
    }

    pagesFetched++;
  }

  return results;
}
