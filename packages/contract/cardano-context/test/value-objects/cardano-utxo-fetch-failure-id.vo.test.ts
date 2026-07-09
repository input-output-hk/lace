import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { CardanoUtxoFetchFailureId } from '../../src/value-objects';

describe('CardanoUtxoFetchFailureId', () => {
  const accountId = AccountId('wallet1-0-764824073');

  it('constructs an ID with the expected prefix', () => {
    const id = CardanoUtxoFetchFailureId(accountId);
    expect(id).toBe(`cardano-utxo-fetch-${accountId}`);
  });
});
