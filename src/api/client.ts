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
  let url: string | undefined = path;
  let pagesFetched = 0;

  while (url && pagesFetched < maxPages) {
    const response = await client.get<PaginatedResponse<T>>(url, {
      params: pagesFetched === 0 ? params : undefined,
    });
    results.push(...response.data.values);
    url = response.data.next;
    pagesFetched++;
  }

  return results;
}
