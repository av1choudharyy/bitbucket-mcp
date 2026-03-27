import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config/index';

const ENV_KEYS = ['BITBUCKET_TOKEN', 'BITBUCKET_WORKSPACE', 'BITBUCKET_API_URL'];
const backup: Record<string, string | undefined> = {};

beforeEach(() => {
  ENV_KEYS.forEach(k => { backup[k] = process.env[k]; delete process.env[k]; });
});
afterEach(() => {
  ENV_KEYS.forEach(k => {
    if (backup[k] === undefined) delete process.env[k];
    else process.env[k] = backup[k];
  });
});

describe('loadConfig', () => {
  it('loads token and workspace from env', () => {
    process.env.BITBUCKET_TOKEN = 'mytoken';
    process.env.BITBUCKET_WORKSPACE = 'myworkspace';
    const config = loadConfig();
    expect(config.token).toBe('mytoken');
    expect(config.workspace).toBe('myworkspace');
    expect(config.apiUrl).toBe('https://api.bitbucket.org/2.0');
  });

  it('uses custom API URL when set', () => {
    process.env.BITBUCKET_TOKEN = 'tok';
    process.env.BITBUCKET_WORKSPACE = 'ws';
    process.env.BITBUCKET_API_URL = 'https://custom.api/2.0';
    const config = loadConfig();
    expect(config.apiUrl).toBe('https://custom.api/2.0');
  });

  it('throws when token is missing', () => {
    process.env.BITBUCKET_WORKSPACE = 'ws';
    expect(() => loadConfig()).toThrow('BITBUCKET_TOKEN');
  });

  it('throws when workspace is missing', () => {
    process.env.BITBUCKET_TOKEN = 'tok';
    expect(() => loadConfig()).toThrow('BITBUCKET_WORKSPACE');
  });
});
