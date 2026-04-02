import type { ApiClient } from '../api/client';
import type { MergeResult } from '../api/types';

export interface ApproveResult {
  approved: boolean;
  user: string | null;
}

export interface MergeInput {
  merge_strategy?: 'merge_commit' | 'squash' | 'fast_forward';
  message?: string;
  close_source_branch?: boolean;
}

export interface MergeResultInfo {
  id: number;
  state: string;
  merge_commit_hash: string | undefined;
}

export async function approvePullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
): Promise<ApproveResult> {
  try {
    const response = await client.post<{ approved?: boolean; user?: { display_name?: string } }>(
      `/repositories/${workspace}/${repo}/pullrequests/${prId}/approve`,
    );
    return {
      approved: response.data.approved ?? true,
      user: response.data.user?.display_name ?? null,
    };
  } catch (err) {
    const retryResponse = await (async () => {
      try {
        return await client.post<{ approved?: boolean; user?: { display_name?: string } }>(
          `/repositories/${workspace}/${repo}/pullrequests/${prId}/approve`,
          {},
        );
      } catch {
        return null;
      }
    })();

    if (retryResponse) {
      return {
        approved: retryResponse.data.approved ?? true,
        user: retryResponse.data.user?.display_name ?? null,
      };
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Bitbucket API error 400')) {
      throw new Error(
        `Unable to approve PR. Bitbucket can reject approval when the authenticated user is the PR author, has already approved, or the token type does not support approval actions. (${message})`,
      );
    }
    throw err;
  }
}

export async function requestChanges(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
): Promise<ApproveResult> {
  await client.delete(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/approve`,
  );
  return {
    approved: false,
    user: null,
  };
}

export async function mergePullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  input: MergeInput,
): Promise<MergeResultInfo> {
  const body: Record<string, unknown> = {
    type: 'pullrequest',
    merge_strategy: input.merge_strategy ?? 'merge_commit',
  };
  if (input.message) body.message = input.message;
  if (input.close_source_branch !== undefined) {
    body.close_source_branch = input.close_source_branch;
  }

  const response = await client.post<MergeResult>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/merge`,
    body,
  );

  return {
    id: response.data.id,
    state: response.data.state,
    merge_commit_hash: response.data.merge_commit?.hash,
  };
}
