import { paginateAll, type ApiClient } from '../api/client';
import type { BitbucketPR, BitbucketUser } from '../api/types';

export interface PRSummary {
  id: number;
  title: string;
  state: string;
  author: string;
  source_branch: string;
  dest_branch: string;
  created_on: string;
  updated_on: string;
  url: string;
}

export interface PRDetail extends PRSummary {
  description: string;
  reviewers: string[];
  comment_count: number;
  task_count: number;
}

export interface CreatePRInput {
  title: string;
  source_branch: string;
  dest_branch?: string;
  description?: string;
  reviewers?: string[];
  close_source_branch?: boolean;
}

export interface UpdatePRInput {
  title?: string;
  description?: string;
  dest_branch?: string;
  reviewers?: string[];
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function mapPRSummary(pr: BitbucketPR): PRSummary {
  return {
    id: pr.id,
    title: pr.title,
    state: pr.state,
    author: pr.author?.display_name ?? 'unknown',
    source_branch: pr.source.branch.name,
    dest_branch: pr.destination.branch.name,
    created_on: pr.created_on,
    updated_on: pr.updated_on,
    url: pr.links.html.href,
  };
}

export async function listPullRequests(
  client: ApiClient,
  workspace: string,
  repo: string,
  options: { state?: string; author?: string; branch?: string } = {},
): Promise<PRSummary[]> {
  const params: Record<string, string> = {
    state: options.state ?? 'OPEN',
  };

  const filters: string[] = [];
  if (options.author) {
    filters.push(`author.nickname = "${escapeQueryValue(options.author)}"`);
  }
  if (options.branch) {
    filters.push(`source.branch.name = "${escapeQueryValue(options.branch)}"`);
  }
  if (filters.length > 0) {
    params.q = filters.join(' AND ');
  }

  const prs = await paginateAll<BitbucketPR>(
    client,
    `/repositories/${workspace}/${repo}/pullrequests`,
    params,
  );

  return prs.map(mapPRSummary);
}

export async function getPullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
): Promise<PRDetail> {
  const response = await client.get<BitbucketPR>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}`,
  );
  const pr = response.data;

  return {
    ...mapPRSummary(pr),
    description: pr.description,
    reviewers: pr.reviewers?.map((r: BitbucketUser) => r.display_name ?? 'unknown') ?? [],
    comment_count: pr.comment_count,
    task_count: pr.task_count,
  };
}

export async function createPullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  input: CreatePRInput,
): Promise<PRDetail> {
  const body: Record<string, unknown> = {
    title: input.title,
    source: { branch: { name: input.source_branch } },
    destination: { branch: { name: input.dest_branch ?? 'main' } },
    close_source_branch: input.close_source_branch ?? false,
  };

  if (input.description) body.description = input.description;
  if (input.reviewers?.length) {
    body.reviewers = input.reviewers.map((id) => ({ account_id: id }));
  }

  const response = await client.post<BitbucketPR>(
    `/repositories/${workspace}/${repo}/pullrequests`,
    body,
  );
  const pr = response.data;

  return {
    ...mapPRSummary(pr),
    description: pr.description,
    reviewers: pr.reviewers?.map((r: BitbucketUser) => r.display_name ?? 'unknown') ?? [],
    comment_count: pr.comment_count,
    task_count: pr.task_count,
  };
}

export async function updatePullRequest(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  input: UpdatePRInput,
): Promise<PRDetail> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.dest_branch !== undefined) body.destination = { branch: { name: input.dest_branch } };
  if (input.reviewers !== undefined) {
    body.reviewers = input.reviewers.map((id) => ({ account_id: id }));
  }

  const response = await client.put<BitbucketPR>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}`,
    body,
  );
  const pr = response.data;

  return {
    ...mapPRSummary(pr),
    description: pr.description,
    reviewers: pr.reviewers?.map((r: BitbucketUser) => r.display_name ?? 'unknown') ?? [],
    comment_count: pr.comment_count,
    task_count: pr.task_count,
  };
}
