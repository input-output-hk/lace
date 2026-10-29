import { TxInId } from '@lace-lib/cardano-key-management';

import { resolvePaymentKeyPathForTxIn, resolveStakeKeyPath } from '../../src';
import {
  contextWithKnownAddresses,
  knownAddressKeyPath,
  knownAddressPaymentKeyPath,
  knownAddressStakeKeyPath,
  rewardAddress,
  txIn,
} from '../testData';

describe('key-paths', () => {
  describe('resolvePaymentKeyPathForTxIn', () => {
    it('returns the payment key path for a known address', async () => {
      expect(
        resolvePaymentKeyPathForTxIn(txIn, {
          ...contextWithKnownAddresses,
          txInKeyPathMap: { [TxInId(txIn)]: knownAddressPaymentKeyPath },
        }),
      ).toEqual(knownAddressKeyPath);
    });
  });
  describe('resolveStakeKeyPath', () => {
    it('returns the stake key path for a known address', async () => {
      expect(
        resolveStakeKeyPath(
          rewardAddress,
          contextWithKnownAddresses.knownAddresses,
        ),
      ).toEqual(knownAddressStakeKeyPath);
    });
  });
});
