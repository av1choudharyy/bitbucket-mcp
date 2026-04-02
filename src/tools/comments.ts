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
    author: c.author?.display_name ?? 'unknown',
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
  const route = `/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`;

  const payloads: Array<Record<string, unknown>> = [];

  // Preferred payload: preserve caller intent and map REMOVED to `from`.
  const preferredInline: Record<string, unknown> = { path: input.path };
  if (input.line_type === 'REMOVED') preferredInline.from = input.line;
  else preferredInline.to = input.line;
  if (input.line_type) preferredInline.line_type = input.line_type;
  payloads.push({ content: { raw: input.content }, inline: preferredInline });

  // Fallback 1: same anchor but no line_type (some Bitbucket setups reject line_type).
  const noLineTypeInline: Record<string, unknown> = { path: input.path };
  if (input.line_type === 'REMOVED') noLineTypeInline.from = input.line;
  else noLineTypeInline.to = input.line;
  payloads.push({ content: { raw: input.content }, inline: noLineTypeInline });

  // Fallback 2: force `to` anchor.
  payloads.push({
    content: { raw: input.content },
    inline: { path: input.path, to: input.line },
  });

  // Fallback 3: force `from` anchor.
  payloads.push({
    content: { raw: input.content },
    inline: { path: input.path, from: input.line },
  });

  let lastError: unknown;
  for (let i = 0; i < payloads.length; i++) {
    try {
      const response = await client.post<BitbucketComment>(route, payloads[i]);
      return mapComment(response.data);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const shouldRetry = message.includes('Bitbucket API error 400') && i < payloads.length - 1;
      if (!shouldRetry) throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to add inline PR comment');
}

export async function deletePrComment(
  client: ApiClient,
  workspace: string,
  repo: string,
  prId: number,
  commentId: number,
): Promise<void> {
  await client.delete(
    `/repositories/${workspace}/${repo}/pullrequests/${prId}/comments/${commentId}`,
  );
}
