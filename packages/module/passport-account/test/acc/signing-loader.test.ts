import { describe, expect, it, vi } from 'vitest';

import { createJubjubAuthoriser } from '../../src/acc/jubjub-authoriser';
import { JubjubDevice } from '../../src/acc/signer';
import { loadJubjubSigning } from '../../src/acc/signing-loader';

describe('loadJubjubSigning', () => {
  it('resolves to the same instance across repeated uses', async () => {
    const [first, second] = await Promise.all([
      loadJubjubSigning(),
      loadJubjubSigning(),
    ]);
    expect(first).toBe(second);
    expect(await loadJubjubSigning()).toBe(first);
  });

  it('resolves to the surface the signing modules export', async () => {
    const signing = await loadJubjubSigning();
    expect(signing.createJubjubAuthoriser).toBe(createJubjubAuthoriser);
    expect(signing.JubjubDevice).toBe(JubjubDevice);
  });

  it('retries the import after a rejected load instead of caching the rejection', async () => {
    vi.resetModules();
    const loadFailure = new Error('chunk load failed');
    let shouldFailNext = true;
    vi.doMock('../../src/acc/signer', async importOriginal => {
      if (shouldFailNext) {
        shouldFailNext = false;
        throw loadFailure;
      }
      return importOriginal();
    });
    try {
      const { loadJubjubSigning: load } = await import(
        '../../src/acc/signing-loader'
      );
      await expect(load()).rejects.toMatchObject({ cause: loadFailure });

      const signing = await load();
      expect(typeof signing.createJubjubAuthoriser).toBe('function');
      expect(typeof signing.JubjubDevice).toBe('function');
      expect(await load()).toBe(signing);
    } finally {
      vi.doUnmock('../../src/acc/signer');
      vi.resetModules();
    }
  });
});
