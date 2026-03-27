import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/api/client', () => ({
  paginateAll: vi.fn(),
}));

import { paginateAll } from '../src/api/client';
import { listPrComments, addPrComment, addPrInlineComment } from '../src/tools/comments';
import type { BitbucketComment } from '../src/api/types';

const mockClient = { post: vi.fn() } as any;
const workspace = 'ws';
const repo = 'my-repo';

const generalComment: BitbucketComment = {
  id: 1,
  content: { raw: 'LGTM!', markup: 'markdown', html: '<p>LGTM!</p>' },
  created_on: '2026-01-01',
  updated_on: '2026-01-01',
  author: { display_name: 'Bob', account_id: 'bob123', nickname: 'bob' },
  deleted: false,
};

const inlineComment: BitbucketComment = {
  id: 2,
  content: { raw: 'Fix this', markup: 'markdown', html: '<p>Fix this</p>' },
  created_on: '2026-01-02',
  updated_on: '2026-01-02',
  author: { display_name: 'Alice', account_id: 'alice123', nickname: 'alice' },
  inline: { path: 'src/foo.ts', from: null, to: 10 },
  deleted: false,
};

beforeEach(() => vi.clearAllMocks());

describe('listPrComments', () => {
  it('returns mapped comments excluding deleted', async () => {
    const deletedComment = { ...generalComment, id: 3, deleted: true };
    vi.mocked(paginateAll).mockResolvedValue([generalComment, inlineComment, deletedComment]);
    const result = await listPrComments(mockClient, workspace, repo, 42);
    expect(result).toHaveLength(2);
  });

  it('maps inline comments with path info', async () => {
    vi.mocked(paginateAll).mockResolvedValue([inlineComment]);
    const result = await listPrComments(mockClient, workspace, repo, 42);
    expect(result[0].type).toBe('inline');
    expect(result[0].inline?.path).toBe('src/foo.ts');
  });

  it('maps general comments with null inline', async () => {
    vi.mocked(paginateAll).mockResolvedValue([generalComment]);
    const result = await listPrComments(mockClient, workspace, repo, 42);
    expect(result[0].type).toBe('general');
    expect(result[0].inline).toBeNull();
  });
});

describe('addPrComment', () => {
  it('posts a general comment', async () => {
    mockClient.post.mockResolvedValue({ data: { ...generalComment, id: 5 } });
    const result = await addPrComment(mockClient, workspace, repo, 42, 'Looks good!');
    expect(mockClient.post).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42/comments`,
      { content: { raw: 'Looks good!' } },
    );
    expect(result.id).toBe(5);
  });
});

describe('addPrInlineComment', () => {
  it('posts inline comment with file and line info', async () => {
    mockClient.post.mockResolvedValue({ data: inlineComment });
    await addPrInlineComment(mockClient, workspace, repo, 42, {
      content: 'Fix this',
      path: 'src/foo.ts',
      line: 10,
      line_type: 'ADDED',
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/pullrequests/42/comments`,
      expect.objectContaining({
        content: { raw: 'Fix this' },
        inline: { path: 'src/foo.ts', to: 10, line_type: 'ADDED' },
      }),
    );
  });

  it('omits line_type when not provided', async () => {
    mockClient.post.mockResolvedValue({ data: inlineComment });
    await addPrInlineComment(mockClient, workspace, repo, 42, {
      content: 'Note',
      path: 'src/bar.ts',
      line: 5,
    });
    const call = mockClient.post.mock.calls[0][1];
    expect(call.inline.line_type).toBeUndefined();
  });
});
