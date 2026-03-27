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
  const response = await client.post<{ approved: boolean; user: { display_name: string } }>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/approve`,
  );
  return {
    approved: response.data.approved,
    user: response.data.user.display_name,
  };
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
  return { approved: false, user: null };
}

export async function mergePullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  input: MergeInput,
): Promise<MergeResultInfo> {
  const body: Record<string, unknown> = {
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
