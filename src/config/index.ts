import * as dotenv from 'dotenv';

dotenv.config();

export interface Config {
  token: string;
  workspace: string;
  apiUrl: string;
}

export function loadConfig(): Config {
  const token = process.env.BITBUCKET_TOKEN;
  const workspace = process.env.BITBUCKET_WORKSPACE;

  if (!token) throw new Error('BITBUCKET_TOKEN environment variable is required');
  if (!workspace) throw new Error('BITBUCKET_WORKSPACE environment variable is required');

  return {
    token,
    workspace,
    apiUrl: process.env.BITBUCKET_API_URL ?? 'https://api.bitbucket.org/2.0',
  };
}
