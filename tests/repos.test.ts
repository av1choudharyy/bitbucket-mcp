import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/api/client', () => ({
  paginateAll: vi.fn(),
}));

import { paginateAll } from '../src/api/client';
import { listRepositories } from '../src/tools/repos';
import type { BitbucketRepository } from '../src/api/types';

const mockClient = {} as any;
const workspace = 'myworkspace';

const repoData: BitbucketRepository[] = [
  { slug: 'my-app', name: 'My App', description: 'App repo', is_private: true, updated_on: '2026-01-01', mainbranch: { name: 'main' } },
  { slug: 'my-lib', name: 'My Lib', description: '', is_private: false, updated_on: '2026-01-02', mainbranch: { name: 'main' } },
];

beforeEach(() => vi.clearAllMocks());

describe('listRepositories', () => {
  it('returns all repos', async () => {
    vi.mocked(paginateAll).mockResolvedValue(repoData);
    const result = await listRepositories(mockClient, workspace);
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe('my-app');
  });

  it('passes query filter as q param', async () => {
    vi.mocked(paginateAll).mockResolvedValue([repoData[0]]);
    await listRepositories(mockClient, workspace, 'app');
    expect(paginateAll).toHaveBeenCalledWith(
      mockClient,
      `/repositories/${workspace}`,
      expect.objectContaining({ q: expect.stringContaining('app') }),
    );
  });

  it('maps fields correctly', async () => {
    vi.mocked(paginateAll).mockResolvedValue([repoData[0]]);
    const result = await listRepositories(mockClient, workspace);
    expect(result[0]).toMatchObject({
      slug: 'my-app',
      name: 'My App',
      is_private: true,
      mainbranch: 'main',
    });
  });
});
