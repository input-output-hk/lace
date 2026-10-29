import { describe, expect, it } from 'vitest';

import { createWalletIdentity } from '../../src/exposed-modules/wallet-identity';

import type { AnyAccount } from '@lace-contract/wallet-repo';

const cardanoAccount = (xpub?: string): AnyAccount =>
  ({
    blockchainName: 'Cardano',
    blockchainSpecific: xpub ? { extendedAccountPublicKey: xpub } : {},
  } as unknown as AnyAccount);

const PREPROD_STAKE_SCRIPT_HASH =
  'f176158fcbbdfc44c1e3b3f0863032dc048c091738b0fa4107975157';

const custodyAccount = (stakeScriptHash = PREPROD_STAKE_SCRIPT_HASH) =>
  ({
    accountType: 'CardanoCustody',
    blockchainName: 'Cardano',
    blockchainSpecific: {
      chainId: { networkId: 0, networkMagic: 1 },
      accountValidatorHash:
        'ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253',
      creatorKeyHash:
        '0e2eb8b05c17851fe132bf308e9bc712ef13191d3899c06b926780e1',
      stakeScriptHash,
      address:
        'addr_test1xrkkr936e9x39s9nyzl95vmvx6hkd0qzcwqwp23sqxyey5l3wc2cljaal3zvrcan7zrrqvkuqjxqj9eckrayzpuh29tsszhnvv',
      rewardAccount:
        'stake_test17rchv9v0ew7lc3xpuwelpp3sxtwqfrqfzuutp7jpq7t4z4cnrk4ek',
      device: {
        extendedAccountPublicKey: 'device-xpub',
        index: 0,
        keyHash: '0e2eb8b05c17851fe132bf308e9bc712ef13191d3899c06b926780e1',
        channel: { type: 'hosted', origin: 'https://passkey.lace.io' },
      },
    },
  } as unknown as AnyAccount);

describe('Cardano WalletIdentity', () => {
  const identity = createWalletIdentity();

  it('has the Cardano blockchain name', () => {
    expect(identity.blockchainName).toBe('Cardano');
  });

  it('returns the extended account public key as the identity key', () => {
    expect(identity.getAccountIdentityKey(cardanoAccount('xpub-abc'))).toBe(
      'xpub-abc',
    );
  });

  it('returns undefined when the account has no extended public key', () => {
    expect(identity.getAccountIdentityKey(cardanoAccount())).toBeUndefined();
  });

  it('returns the network-scoped stake script hash, not the device key, as the identity key of a custody account', () => {
    expect(identity.getAccountIdentityKey(custodyAccount())).toBe(
      `cardano-custody:1:${PREPROD_STAKE_SCRIPT_HASH}`,
    );
  });

  it('lower-cases the stake script hash of a custody account', () => {
    expect(
      identity.getAccountIdentityKey(
        custodyAccount(PREPROD_STAKE_SCRIPT_HASH.toUpperCase()),
      ),
    ).toBe(`cardano-custody:1:${PREPROD_STAKE_SCRIPT_HASH}`);
  });

  it('returns undefined for non-Cardano accounts', () => {
    const bitcoinAccount = {
      blockchainName: 'Bitcoin',
      blockchainSpecific: { extendedAccountPublicKeys: {} },
    } as unknown as AnyAccount;
    expect(identity.getAccountIdentityKey(bitcoinAccount)).toBeUndefined();
  });
});
