import { paginateAll, type ApiClient } from '../api/client';
import type { BitbucketComment } from '../api/types';

export interface CommentInfo {
  id: number;
  type: 'general' | 'inline';
  content: string;
  author: string;
  created_on: string;
  inline: { path: string; from: number | null; to: number | null } | null;
}

export interface InlineCommentInput {
  content: string;
  path: string;
  line: number;
  line_type?: 'ADDED' | 'REMOVED' | 'CONTEXT';
}

function mapComment(c: BitbucketComment): CommentInfo {
  return {
    id: c.id,
    type: c.inline ? 'inline' : 'general',
    content: c.content.raw,
    author: c.author.display_name,
    created_on: c.created_on,
    inline: c.inline
      ? { path: c.inline.path, from: c.inline.from, to: c.inline.to }
      : null,
  };
}

export async function listPrComments(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
): Promise<CommentInfo[]> {
  const comments = await paginateAll<BitbucketComment>(
    client,
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`,
  );
  return comments.filter((c) => !c.deleted).map(mapComment);
}

export async function addPrComment(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  content: string,
): Promise<CommentInfo> {
  const response = await client.post<BitbucketComment>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`,
    { content: { raw: content } },
  );
  return mapComment(response.data);
}

export async function addPrInlineComment(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  input: InlineCommentInput,
): Promise<CommentInfo> {
  const inlineField: Record<string, unknown> = { path: input.path, to: input.line };
  if (input.line_type) inlineField.line_type = input.line_type;

  const body: Record<string, unknown> = {
    content: { raw: input.content },
    inline: inlineField,
  };

  const response = await client.post<BitbucketComment>(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`,
    body,
  );
  return mapComment(response.data);
}
