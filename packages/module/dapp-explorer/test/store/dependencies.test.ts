import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCardanoCubeProvider } from '../../src/store/dependencies';

const failingFetch = () =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new TypeError('Failed to fetch');
  });

describe('createCardanoCubeProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not issue a request until the observable is subscribed', () => {
    const fetchSpy = failingFetch();
    const provider = createCardanoCubeProvider('https://cube.invalid');

    provider.fetchProjectPage(1);
    provider.fetchCategories();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('issues a fresh request per subscription so retries re-fetch', async () => {
    const fetchSpy = failingFetch();
    const provider = createCardanoCubeProvider('https://cube.invalid');

    const page$ = provider.fetchProjectPage(1);
    await expect(firstValueFrom(page$)).rejects.toThrow('Failed to fetch');
    await expect(firstValueFrom(page$)).rejects.toThrow('Failed to fetch');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
