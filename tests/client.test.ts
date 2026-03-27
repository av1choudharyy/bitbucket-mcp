import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios');

import axios from 'axios';
import { createClient, paginateAll } from '../src/api/client';

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
  interceptors: { response: { use: vi.fn() } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
});

describe('createClient', () => {
  it('creates axios instance with Bearer auth and base URL', () => {
    createClient({ token: 'mytoken', workspace: 'ws', apiUrl: 'https://api.bitbucket.org/2.0' });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.bitbucket.org/2.0',
        headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }),
      }),
    );
  });
});

describe('paginateAll', () => {
  it('fetches single page', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { values: [{ id: 1 }, { id: 2 }], next: undefined },
    });
    const results = await paginateAll(mockAxiosInstance as any, '/repos');
    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('follows next pages', async () => {
    mockAxiosInstance.get
      .mockResolvedValueOnce({
        data: { values: [{ id: 1 }], next: 'https://api.bitbucket.org/2.0/repos?page=2' },
      })
      .mockResolvedValueOnce({
        data: { values: [{ id: 2 }], next: undefined },
      });
    const results = await paginateAll(mockAxiosInstance as any, '/repos');
    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
  });

  it('stops at page limit', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { values: [{ id: 1 }], next: 'https://api.bitbucket.org/2.0/repos?page=2' },
    });
    const results = await paginateAll(mockAxiosInstance as any, '/repos', {}, 3);
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });
});
