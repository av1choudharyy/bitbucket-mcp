import type { ApiClient } from '../api/client';

export async function getPullRequestDiff(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
): Promise<string> {
  const response = await client.get<string>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`,
    { headers: { Accept: 'text/plain' } },
  );
  return response.data;
}
