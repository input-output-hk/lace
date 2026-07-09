import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { computeOwnKeyHashes } from '../../src/security/match-own-witnesses';

import type {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '../../src/types';

const networkId = Cardano.NetworkId.Testnet;
const paymentHash = Crypto.Hash28ByteBase16('11'.repeat(28));
const stakeHash = Crypto.Hash28ByteBase16('22'.repeat(28));

const paymentCredential = {
  hash: paymentHash,
  type: Cardano.CredentialType.KeyHash,
};
const stakeCredential = {
  hash: stakeHash,
  type: Cardano.CredentialType.KeyHash,
};

const rewardAccount = Cardano.RewardAddress.fromCredentials(
  networkId,
  stakeCredential,
)
  .toAddress()
  .toBech32() as unknown as CardanoRewardAccount;

const bech32 = (address: { toAddress: () => { toBech32: () => string } }) =>
  address.toAddress().toBech32() as unknown as CardanoPaymentAddress;

const baseAddress = bech32(
  Cardano.BaseAddress.fromCredentials(
    networkId,
    paymentCredential,
    stakeCredential,
  ),
);
const enterpriseAddress = bech32(
  Cardano.EnterpriseAddress.fromCredentials(networkId, paymentCredential),
);
const pointerAddress = bech32(
  Cardano.PointerAddress.fromCredentials(networkId, paymentCredential, {
    slot: BigInt(1),
    txIndex: 2,
    certIndex: 3,
  } as unknown as Cardano.Pointer),
);

describe('computeOwnKeyHashes', () => {
  it('collects the payment key hash from a base address', () => {
    expect(computeOwnKeyHashes([baseAddress], rewardAccount)).toContain(
      paymentHash,
    );
  });

  it('collects the payment key hash from an enterprise address', () => {
    expect(computeOwnKeyHashes([enterpriseAddress], rewardAccount)).toContain(
      paymentHash,
    );
  });

  it('collects the payment key hash from a pointer address', () => {
    expect(computeOwnKeyHashes([pointerAddress], rewardAccount)).toContain(
      paymentHash,
    );
  });

  it('includes the reward account key hash', () => {
    expect(computeOwnKeyHashes([], rewardAccount)).toContain(stakeHash);
  });
});
