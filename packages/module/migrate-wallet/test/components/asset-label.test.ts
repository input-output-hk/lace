import { describe, expect, it } from 'vitest';

import { assetLabel } from '../../src/components/asset-label';

const POLICY_ID = 'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235';

describe('assetLabel', () => {
  it('names an asset from the text in its own id', () => {
    // "HOSKY", hex-encoded, is the second half of the asset id.
    expect(assetLabel(`${POLICY_ID}484f534b59`)).toBe('HOSKY');
  });

  it('elides the id of an asset minted without a name', () => {
    expect(assetLabel(POLICY_ID)).toBe('a0028f350aaa…d481c235');
  });

  // Asset names are arbitrary bytes on chain, and the SDK throws converting
  // them. A token nobody can name must not take the review screen down with it.
  it('elides the id of an asset whose name is not text', () => {
    expect(assetLabel(`${POLICY_ID}ff`)).toBe('a0028f350aaa…81c235ff');
  });
});
