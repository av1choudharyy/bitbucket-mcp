import { paginateAll, type ApiClient } from '../api/client';
import type { BitbucketRepository } from '../api/types';

export interface RepoInfo {
  slug: string;
  name: string;
  description: string;
  is_private: boolean;
  updated_on: string;
  mainbranch: string | undefined;
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function listRepositories(
  client: ApiClient,
  workspace: string,
  query?: string,
): Promise<RepoInfo[]> {
  const params: Record<string, string> = {};
  if (query) {
    params.q = `name ~ "${escapeQueryValue(query)}"`;
  }

  const repos = await paginateAll<BitbucketRepository>(
    client,
    `/repositories/${workspace}`,
    params,
  );

  return repos.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    is_private: r.is_private,
    updated_on: r.updated_on,
    mainbranch: r.mainbranch?.name,
  }));
}
