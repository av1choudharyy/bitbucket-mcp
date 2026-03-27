#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig } from './config/index';
import { createClient } from './api/client';
import { listRepositories } from './tools/repos';
import {
  listPullRequests,
  getPullRequest,
  createPullRequest,
  updatePullRequest,
} from './tools/prs';
import { getPullRequestDiff } from './tools/diff';
import { listPrComments, addPrComment, addPrInlineComment } from './tools/comments';
import { approvePullRequest, requestChanges, mergePullRequest } from './tools/review';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => unknown;

(async () => {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    process.stderr.write(`[bitbucket-mcp] Configuration error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const client = createClient(config);
  const workspace = config.workspace;

  const server = new McpServer({
    name: 'bitbucket-mcp',
    version: '1.0.0',
  });

  // Type alias needed: Zod 3.25 inferred types are incompatible with MCP SDK's
  // server.tool() generic overload. Safe at runtime — SDK accepts plain ZodRawShape.
  const tool = server.tool.bind(server) as AnyFn;

  tool(
    'list_repositories',
    'List repositories in the Bitbucket workspace',
    { query: z.string().optional().describe('Optional name filter') },
    async ({ query }: { query?: string }) => {
      try {
        const result = await listRepositories(client, workspace, query);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'list_pull_requests',
    'List pull requests for a repository',
    {
      repo: z.string().min(1).describe('Repository slug'),
      state: z.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']).optional().default('OPEN'),
      author: z.string().optional().describe('Filter by author nickname'),
      branch: z.string().optional().describe('Filter by source branch name'),
    },
    async ({ repo, state, author, branch }: { repo: string; state?: string; author?: string; branch?: string }) => {
      try {
        const result = await listPullRequests(client, workspace, repo, { state, author, branch });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'get_pull_request',
    'Get full details of a pull request',
    {
      repo: z.string().min(1).describe('Repository slug'),
      pr_id: z.number().int().positive().describe('Pull request ID'),
    },
    async ({ repo, pr_id }: { repo: string; pr_id: number }) => {
      try {
        const result = await getPullRequest(client, workspace, repo, pr_id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'create_pull_request',
    'Create a new pull request',
    {
      repo: z.string().min(1).describe('Repository slug'),
      title: z.string().min(1).describe('PR title'),
      source_branch: z.string().min(1).describe('Source branch name'),
      dest_branch: z.string().optional().default('main').describe('Destination branch (default: main)'),
      description: z.string().optional().describe('PR description (Markdown)'),
      reviewers: z.array(z.string()).optional().describe('List of reviewer account IDs'),
      close_source_branch: z.boolean().optional().default(false),
    },
    async ({ repo, title, source_branch, dest_branch, description, reviewers, close_source_branch }: {
      repo: string; title: string; source_branch: string; dest_branch?: string;
      description?: string; reviewers?: string[]; close_source_branch?: boolean;
    }) => {
      try {
        const result = await createPullRequest(client, workspace, repo, {
          title, source_branch, dest_branch, description, reviewers, close_source_branch,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'update_pull_request',
    'Update title, description, destination branch, or reviewers of a PR',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
      title: z.string().optional(),
      description: z.string().optional(),
      dest_branch: z.string().optional(),
      reviewers: z.array(z.string()).optional().describe('Replaces existing reviewer list with these account IDs'),
    },
    async ({ repo, pr_id, title, description, dest_branch, reviewers }: {
      repo: string; pr_id: number; title?: string; description?: string;
      dest_branch?: string; reviewers?: string[];
    }) => {
      try {
        const result = await updatePullRequest(client, workspace, repo, pr_id, {
          title, description, dest_branch, reviewers,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'get_pull_request_diff',
    'Get the unified diff for a pull request',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
    },
    async ({ repo, pr_id }: { repo: string; pr_id: number }) => {
      try {
        const result = await getPullRequestDiff(client, workspace, repo, pr_id);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'list_pr_comments',
    'List all comments (general and inline) on a pull request',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
    },
    async ({ repo, pr_id }: { repo: string; pr_id: number }) => {
      try {
        const result = await listPrComments(client, workspace, repo, pr_id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'add_pr_comment',
    'Add a general comment to a pull request',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
      content: z.string().min(1).describe('Comment body (Markdown supported)'),
    },
    async ({ repo, pr_id, content }: { repo: string; pr_id: number; content: string }) => {
      try {
        const result = await addPrComment(client, workspace, repo, pr_id, content);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'add_pr_inline_comment',
    'Add an inline code comment on a specific file and line in a pull request',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
      content: z.string().min(1).describe('Comment body (Markdown supported)'),
      path: z.string().min(1).describe('File path relative to repo root'),
      line: z.number().int().positive().describe('Line number in the diff'),
      line_type: z.enum(['ADDED', 'REMOVED', 'CONTEXT']).optional().default('ADDED'),
    },
    async ({ repo, pr_id, content, path, line, line_type }: {
      repo: string; pr_id: number; content: string; path: string; line: number; line_type?: string;
    }) => {
      try {
        const result = await addPrInlineComment(client, workspace, repo, pr_id, {
          content, path, line,
          line_type: line_type as 'ADDED' | 'REMOVED' | 'CONTEXT' | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'approve_pull_request',
    'Approve a pull request as the authenticated user',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
    },
    async ({ repo, pr_id }: { repo: string; pr_id: number }) => {
      try {
        const result = await approvePullRequest(client, workspace, repo, pr_id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'request_changes',
    'Remove approval from a pull request (request changes)',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
    },
    async ({ repo, pr_id }: { repo: string; pr_id: number }) => {
      try {
        const result = await requestChanges(client, workspace, repo, pr_id);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  tool(
    'merge_pull_request',
    'Merge a pull request',
    {
      repo: z.string().min(1),
      pr_id: z.number().int().positive(),
      merge_strategy: z.enum(['merge_commit', 'squash', 'fast_forward']).optional().default('merge_commit'),
      message: z.string().optional().describe('Optional commit message override'),
      close_source_branch: z.boolean().optional(),
    },
    async ({ repo, pr_id, merge_strategy, message, close_source_branch }: {
      repo: string; pr_id: number; merge_strategy?: string; message?: string; close_source_branch?: boolean;
    }) => {
      try {
        const result = await mergePullRequest(client, workspace, repo, pr_id, {
          merge_strategy: merge_strategy as 'merge_commit' | 'squash' | 'fast_forward' | undefined,
          message,
          close_source_branch,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
})();
