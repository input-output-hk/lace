import { Cardano } from '@lace-lib/cardano-core';
import { util } from '@lace-lib/cardano-key-management';
import { areStringsEqualInConstantTime } from '@lace-lib/util/common';

import type { TrezorTxTransformerContext } from '../types';
import type * as Crypto from '@lace-lib/cardano-crypto';
import type { Transform } from '@lace-lib/util/common';
import type * as Trezor from '@trezor/connect';

export const toRequiredSigner: Transform<
  Crypto.Ed25519KeyHashHex,
  Trezor.CardanoRequiredSigner,
  TrezorTxTransformerContext
> = (keyHash, context) => {
  const paymentCredKnownAddress = context?.knownAddresses.find(address => {
    const paymentCredential = Cardano.Address.fromBech32(address.address)
      ?.asBase()
      ?.getPaymentCredential().hash;
    return (
      !!paymentCredential &&
      areStringsEqualInConstantTime(paymentCredential.toString(), keyHash)
    );
  });

  const stakeCredKnownAddress = context?.knownAddresses.find(address => {
    const stakeCredential = Cardano.RewardAccount.toHash(address.rewardAccount);
    return (
      !!stakeCredential &&
      areStringsEqualInConstantTime(stakeCredential.toString(), keyHash)
    );
  });

  const paymentKeyPath = paymentCredKnownAddress
    ? util.paymentKeyPathFromGroupedAddress(paymentCredKnownAddress)
    : null;
  const stakeKeyPath = stakeCredKnownAddress
    ? util.stakeKeyPathFromGroupedAddress(stakeCredKnownAddress)
    : null;

  if (paymentKeyPath) {
    return {
      keyHash: undefined,
      keyPath: paymentKeyPath,
    };
  }

  if (stakeKeyPath) {
    return {
      keyHash: undefined,
      keyPath: stakeKeyPath,
    };
  }

  return {
    keyHash,
    keyPath: undefined,
  };
};

export const mapRequiredSigners = (
  signers: Crypto.Ed25519KeyHashHex[],
  context: TrezorTxTransformerContext,
): Trezor.CardanoRequiredSigner[] =>
  signers.map(signer => toRequiredSigner(signer, context));
