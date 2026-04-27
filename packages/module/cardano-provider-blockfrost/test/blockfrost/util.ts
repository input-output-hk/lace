import type { Mock } from 'vitest';

export const mockResponses = (
  request: Mock,
  responses: [RegExp | string, unknown][],
) => {
  request.mockImplementation(async (endpoint: string) => {
    for (const [match, response] of responses) {
      if (typeof match === 'string') {
        if (match === endpoint) {
          if (response instanceof Error) throw response;
          return response;
        }
      } else if (match.test(endpoint)) {
        return response;
      }
    }
    throw new Error(`Not implemented/matched: ${endpoint}`);
  });
};

export const generateRandomCharacters = (length: number) =>
  Array(length)
    .fill(0)
    .map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)])
    .join('');
