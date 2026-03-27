import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/api/client', () => ({
  paginateAll: vi.fn(),
}));

import { paginateAll } from '../src/api/client';
import { listPullRequests, getPullRequest, createPullRequest, updatePullRequest } from '../src/tools/prs';
import type { BitbucketPR } from '../src/api/types';

const workspace = 'ws';
const repo = 'my-repo';

const mockPR: BitbucketPR = {
  id: 42,
  title: 'Add feature',
  description: 'Desc',
  state: 'OPEN',
  author: { display_name: 'Alice', account_id: 'abc123', nickname: 'alice' },
  source: { branch: { name: 'feature/foo' }, repository: { full_name: 'ws/my-repo' } },
  destination: { branch: { name: 'main' }, repository: { full_name: 'ws/my-repo' } },
  reviewers: [],
  participants: [],
  created_on: '2026-01-01',
  updated_on: '2026-01-02',
  comment_count: 2,
  task_count: 0,
  close_source_branch: false,
  links: { html: { href: 'https://bitbucket.org/ws/my-repo/pull-requests/42' }, self: { href: '' } },
};

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as any;

beforeEach(() => vi.clearAllMocks());

describe('listPullRequests', () => {
  it('lists open PRs by default', async () => {
    vi.mocked(paginateAll).mockResolvedValue([mockPR]);
    const result = await listPullRequests(mockClient, workspace, repo);
    expect(paginateAll).toHaveBeenCalledWith(
      mockClient,
      `/repositories/${workspace}/${repo}/pullrequests`,
      expect.objectContaining({ state: 'OPEN' }),
    );
    expect(result[0].id).toBe(42);
    expect(result[0].source_branch).toBe('feature/foo');
    expect(result[0].dest_branch).toBe('main');
  });

  it('filters by author when provided', async () => {
    vi.mocked(paginateAll).mockResolvedValue([]);
    await listPullRequests(mockClient, workspace, repo, { author: 'alice' });
    expect(paginateAll).toHaveBeenCalledWith(
      mockClient,
      expect.any(String),
      expect.objectContaining({ q: expect.stringContaining('alice') }),
    );
  });
});

describe('getPullRequest', () => {
  it('fetches a specific PR by id', async () => {
    mockClient.get.mockResolvedValue({ data: mockPR });
    const result = await getPullRequest(mockClient, workspace, repo, 42);
    expect(mockClient.get).toHaveBeenCalledWith(`/repositories/${workspace}/${repo}/pullrequests/42`);
    expect(result.id).toBe(42);
    expect(result.url).toBe('https://bitbucket.org/ws/my-repo/pull-requests/42');
  });
});

describe('createPullRequest', () => {
  it('posts a new PR with required fields', async () => {
    mockClient.post.mockResolvedValue({ data: { ...mockPR, id: 43 } });
    const result = await createPullRequest(mockClient, workspace, repo, {
      title: 'New PR',
      source_branch: 'feature/new',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests`,
      expect.objectContaining({
        title: 'New PR',
        source: { branch: { name: 'feature/new' } },
        destination: { branch: { name: 'main' } },
      }),
    );
    expect(result.id).toBe(43);
  });

  it('uses custom dest_branch when provided', async () => {
    mockClient.post.mockResolvedValue({ data: mockPR });
    await createPullRequest(mockClient, workspace, repo, {
      title: 'PR',
      source_branch: 'feat',
      dest_branch: 'develop',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ destination: { branch: { name: 'develop' } } }),
    );
  });
});

describe('updatePullRequest', () => {
  it('sends only provided fields', async () => {
    mockClient.put.mockResolvedValue({ data: mockPR });
    await updatePullRequest(mockClient, workspace, repo, 42, { title: 'Updated' });
    expect(mockClient.put).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42`,
      { title: 'Updated' },
    );
  });
});
