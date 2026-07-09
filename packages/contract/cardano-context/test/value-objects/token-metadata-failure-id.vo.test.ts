import { TokenId } from '@lace-contract/tokens';
import { describe, expect, it } from 'vitest';

import { TokenMetadataFailureId } from '../../src/value-objects';

describe('TokenMetadataFailureId', () => {
  it('constructs an ID with the expected prefix', () => {
    const tokenId = TokenId('ada-token');
    const id = TokenMetadataFailureId(tokenId);
    expect(id).toBe(`cardano-token-metadata-${tokenId}`);
  });
});
