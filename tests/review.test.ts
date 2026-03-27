import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvePullRequest, requestChanges, mergePullRequest } from '../src/tools/review';

const mockClient = {
  post: vi.fn(),
  delete: vi.fn(),
} as any;

const workspace = 'ws';
const repo = 'my-repo';

beforeEach(() => vi.clearAllMocks());

describe('approvePullRequest', () => {
  it('POSTs to approve endpoint', async () => {
    mockClient.post.mockResolvedValue({
      data: { approved: true, user: { display_name: 'Alice', account_id: 'a1', nickname: 'alice' } },
    });
    const result = await approvePullRequest(mockClient, workspace, repo, 42);
    expect(mockClient.post).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42/approve`,
    );
    expect(result.approved).toBe(true);
    expect(result.user).toBe('Alice');
  });
});

describe('requestChanges', () => {
  it('DELETEs from approve endpoint to unapprove', async () => {
    mockClient.delete.mockResolvedValue({ data: {} });
    const result = await requestChanges(mockClient, workspace, repo, 42);
    expect(mockClient.delete).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42/approve`,
    );
    expect(result.approved).toBe(false);
    expect(result.user).toBeNull();
  });
});

describe('mergePullRequest', () => {
  it('merges with default strategy', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 42, state: 'MERGED', merge_commit: { hash: 'abc123' } },
    });
    const result = await mergePullRequest(mockClient, workspace, repo, 42, {});
    expect(mockClient.post).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42/merge`,
      expect.objectContaining({ merge_strategy: 'merge_commit' }),
    );
    expect(result.merge_commit_hash).toBe('abc123');
  });

  it('passes custom merge strategy and message', async () => {
    mockClient.post.mockResolvedValue({
      data: { id: 42, state: 'MERGED', merge_commit: { hash: 'def456' } },
    });
    await mergePullRequest(mockClient, workspace, repo, 42, {
      merge_strategy: 'squash',
      message: 'Squash all commits',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        merge_strategy: 'squash',
        message: 'Squash all commits',
      }),
    );
  });
});
