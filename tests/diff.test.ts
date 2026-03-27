import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPullRequestDiff } from '../src/tools/diff';

const mockClient = { get: vi.fn() } as any;

beforeEach(() => vi.clearAllMocks());

describe('getPullRequestDiff', () => {
  it('fetches unified diff as string', async () => {
    const diffText = 'diff --git a/foo.ts b/foo.ts\n--- a/foo.ts\n+++ b/foo.ts\n@@ -1 +1 @@\n-old\n+new';
    mockClient.get.mockResolvedValue({ data: diffText });

    const result = await getPullRequestDiff(mockClient, 'ws', 'repo', 42);

    expect(mockClient.get).toHaveBeenCalledWith(
      '/repositories/ws/repo/pullrequests/42/diff',
      expect.objectContaining({ headers: { Accept: 'text/plain' } }),
    );
    expect(result).toBe(diffText);
  });

  it('returns empty string for PR with no diff', async () => {
    mockClient.get.mockResolvedValue({ data: '' });
    const result = await getPullRequestDiff(mockClient, 'ws', 'repo', 1);
    expect(result).toBe('');
  });
});
