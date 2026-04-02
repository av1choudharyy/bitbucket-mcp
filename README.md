# bitbucket-mcp

MCP server for Bitbucket Cloud. Gives AI assistants full PR lifecycle management: list, read, create, update, review, comment, and merge pull requests.

## Requirements

- Node.js >= 18
- Bitbucket Cloud workspace
- HTTP Access Token with `pullrequest:write` scope

## Installation

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```
BITBUCKET_TOKEN=your_http_access_token
BITBUCKET_WORKSPACE=your_workspace_slug
```

Create your HTTP Access Token at:
`https://bitbucket.org/<your-workspace>/workspace/settings/access-tokens`

Required scopes: `Repositories: Read`, `Pull requests: Write`

## Claude Desktop / Claude Code MCP Config

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "node",
      "args": ["/path/to/bitbucket-mcp/dist/index.js"],
      "env": {
        "BITBUCKET_TOKEN": "your_token",
        "BITBUCKET_WORKSPACE": "your_workspace"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `list_repositories` | List repos in workspace |
| `list_pull_requests` | List PRs with state/author/branch filters |
| `get_pull_request` | Get full PR details |
| `create_pull_request` | Open a new PR |
| `update_pull_request` | Update title, description, reviewers |
| `get_pull_request_diff` | Get unified diff |
| `list_pr_comments` | List all comments (general + inline) |
| `add_pr_comment` | Add a general comment |
| `add_pr_inline_comment` | Add an inline code comment |
| `approve_pull_request` | Approve a PR |
| `request_changes` | Remove approval / request changes |
| `merge_pull_request` | Merge with strategy (merge commit/squash/fast-forward) |
