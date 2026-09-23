import { Cardano } from '@cardano-sdk/core';
import { mockProviders } from '@cardano-sdk/util-dev';
import { describe, expect, it } from 'vitest';

import { resolveAccountKeyHashes } from '../../../src/store/night-designation/account-key-hashes';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

const { utxo } = mockProviders;
const ownAddress = utxo[0][1].address;

const accountId = 'acc-1' as AccountId;
const cardanoAddress = {
  accountId,
  blockchainName: 'Cardano',
  address: ownAddress,
} as unknown as AnyAddress;

describe('resolveAccountKeyHashes', () => {
  it('derives the payment + stake key hashes and primary address', () => {
    const credentials = resolveAccountKeyHashes([cardanoAddress], accountId);

    expect(credentials.primaryAddress).toBe(ownAddress);
    expect(credentials.paymentKeyHash).toHaveLength(28);
    expect(credentials.stakeKeyHash).toHaveLength(28);
  });

  it('throws when the account has no Cardano address', () => {
    expect(() => resolveAccountKeyHashes([], accountId)).toThrow(
      'No Cardano addresses found for account',
    );
  });

  it('throws when the primary address is not a base (payment+stake) address', () => {
    // An enterprise (payment-only) address has no stake credential, so asBase()
    // returns undefined — the validator's check_auth needs both hashes.
    const enterpriseAddress = Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      Cardano.Address.fromString(ownAddress)!.asBase()!.getPaymentCredential(),
    )
      .toAddress()
      .toBech32();

    expect(() =>
      resolveAccountKeyHashes(
        [
          {
            ...cardanoAddress,
            address: enterpriseAddress,
          } as unknown as AnyAddress,
        ],
        accountId,
      ),
    ).toThrow('Account address is not a base (payment+stake) address');
  });
});
