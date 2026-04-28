import { Response } from 'node-fetch';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient, HttpClientError, buildUrl } from '../src';

import type { Mock } from 'vitest';

describe('HttpClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  describe('Constructor', () => {
    it('should normalize a baseUrl without a trailing slash', async () => {
      const client = new HttpClient({ baseUrl: 'https://example.com/api' });
      await client.request('test');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.any(Object),
      );
    });

    it('should keep the trailing slash on a baseUrl that already has one', async () => {
      const client = new HttpClient({ baseUrl: 'https://example.com/api/' });
      await client.request('test');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.any(Object),
      );
    });
  });

  describe('request', () => {
    it('resolves with parsed data and status on a successful request', async () => {
      const client = new HttpClient({ baseUrl: 'https://api.test' });
      const responseData = { id: 1, success: true };
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(responseData), { status: 200 }),
        );

      const response = await client.request('data');
      expect(response).toEqual({
        data: responseData,
        status: 200,
      });
    });

    it('rejects with HttpClientError when fetch returns a 4xx/5xx status', async () => {
      const client = new HttpClient({ baseUrl: 'https://api.test' });
      const errorBody = 'Resource not found';
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(errorBody, { status: 404 }));

      try {
        await client.request('non-existent');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        if (error instanceof HttpClientError) {
          expect(error.status).toBe(404);
          expect(error.body).toBe(errorBody);
        }
      }
    });

    it('builds the same URL whether endpoint has a leading slash or not', async () => {
      const client = new HttpClient({ baseUrl: 'https://api.test/v0' });

      const mockResponseData = { data: 'id' };
      const mockResponse = new Response(JSON.stringify(mockResponseData), {
        status: 200,
      });
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.request('epochs/latest');
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.test/v0/epochs/latest',
        expect.any(Object),
      );

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockResponseData), { status: 200 }),
        );
      await client.request('/epochs/latest');
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://api.test/v0/epochs/latest',
        expect.any(Object),
      );
    });

    describe('Query Parameters', () => {
      it('should correctly append query parameters to the URL', async () => {
        const client = new HttpClient({ baseUrl: 'https://api.test' });
        await client.request('users', {
          params: { search: 'test', page: 2, active: true },
        });
        const expectedUrl =
          'https://api.test/users?search=test&page=2&active=true';
        expect(global.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.any(Object),
        );
      });

      it('should ignore undefined values in query parameters', async () => {
        const client = new HttpClient({ baseUrl: 'https://api.test' });
        await client.request('users', {
          params: { search: 'test', page: undefined, limit: 100 },
        });
        const expectedUrl = 'https://api.test/users?search=test&limit=100';
        expect(global.fetch).toHaveBeenCalledWith(
          expectedUrl,
          expect.any(Object),
        );
      });
    });

    describe('Headers', () => {
      it('should merge default and per-request headers', async () => {
        const client = new HttpClient({
          baseUrl: 'https://api.test',
          requestInit: { headers: { 'X-Default': 'default-value' } },
        });

        await client.request('test', {
          headers: { 'X-Request': 'request-value' },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const fetchOptions = (global.fetch as Mock).mock.calls[0][1];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(fetchOptions.headers).toEqual({
          'X-Default': 'default-value',
          'X-Request': 'request-value',
        });
      });

      it('should allow per-request headers to override default headers', async () => {
        const client = new HttpClient({
          baseUrl: 'https://api.test',
          requestInit: {
            headers: {
              'X-Api-Key': 'default-key',
              'Content-Type': 'application/json',
            },
          },
        });

        await client.request('test', {
          headers: { 'X-Api-Key': 'override-key' },
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const fetchOptions = (global.fetch as Mock).mock.calls[0][1];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(fetchOptions.headers).toEqual({
          'X-Api-Key': 'override-key',
          'Content-Type': 'application/json',
        });
      });
    });

    describe('Specific Error Handling', () => {
      it('should throw HttpClientError on JSON parsing failure', async () => {
        const client = new HttpClient({ baseUrl: 'https://api.test' });
        global.fetch = vi
          .fn()
          .mockResolvedValue(new Response('invalid-json', { status: 200 }));

        await expect(client.request('test')).rejects.toThrow(
          new HttpClientError(200, 'Failed to parse json'),
        );
      });

      it('should wrap network errors in HttpClientError', async () => {
        const client = new HttpClient({ baseUrl: 'https://api.test' });
        const networkError = new TypeError('Failed to fetch');
        global.fetch = vi.fn().mockRejectedValue(networkError);

        try {
          await client.request('test');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpClientError);
          if (error instanceof HttpClientError) {
            expect(error.status).toBeUndefined();
            expect(error.innerError).toBe(networkError);
          }
        }
      });
    });
  });

  describe('buildUrl', () => {
    it('should correctly join segments to a base URL without a trailing slash', () => {
      const baseUrl = 'https://api.example.com';
      const segments = ['v0', 'api'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v0/api');
    });

    it('should correctly join segments to a base URL with a trailing slash', () => {
      const baseUrl = 'https://api.example.com/';
      const segments = ['v0', 'api'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v0/api');
    });

    it('should handle segments with leading slashes', () => {
      const baseUrl = 'http://localhost:3000';
      const segments = ['/api', '/v0'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('http://localhost:3000/api/v0');
    });

    it('should handle segments with trailing slashes', () => {
      const baseUrl = 'http://localhost:3000';
      const segments = ['api/', 'v0/'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('http://localhost:3000/api/v0');
    });

    it('should handle segments with both leading and trailing slashes', () => {
      const baseUrl = 'https://api.example.com';
      const segments = ['/v1/', '/users/', '/456/'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v1/users/456');
    });

    it('should handle segments with multiple slashes and treat them as one', () => {
      const baseUrl = 'https://api.example.com';
      const segments = ['//v1//', '///users'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v1/users');
    });

    it('should filter out segments that only contain slashes', () => {
      const baseUrl = 'https://api.example.com';
      const segments = ['v1', '/', '//', 'users'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v1/users');
    });

    it('should return the base URL with a trailing slash if the segments array is empty', () => {
      const baseUrl = 'https://api.example.com/v1';
      const segments: string[] = [];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/v1/');
    });

    it('should handle a base URL that already contains a path', () => {
      const baseUrl = 'https://example.com/base/path';
      const segments = ['resource', 'id'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://example.com/base/path/resource/id');
    });

    it('should correctly build a URL with a single segment', () => {
      const baseUrl = 'https://api.example.com';
      const segments = ['status'];
      const result = buildUrl(segments, baseUrl);
      expect(result.href).toBe('https://api.example.com/status');
    });

    it('should handle undefined', () => {
      const baseUrl = 'https://api.example.com';
      const result = buildUrl([undefined as unknown as string, 'api'], baseUrl);
      expect(result.href).toBe('https://api.example.com/api');
    });
  });
});
