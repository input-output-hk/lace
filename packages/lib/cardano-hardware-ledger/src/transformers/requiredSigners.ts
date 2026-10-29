import * as Ledger from '@cardano-foundation/ledgerjs-hw-app-cardano';
import { Cardano } from '@lace-lib/cardano-core';
import { util } from '@lace-lib/cardano-key-management';
import { areStringsEqualInConstantTime } from '@lace-lib/util/common';

import type { LedgerTxTransformerContext } from '../types';
import type * as Crypto from '@lace-lib/cardano-crypto';
import type { Transform } from '@lace-lib/util/common';

export const toRequiredSigner: Transform<
  Crypto.Ed25519KeyHashHex,
  Ledger.RequiredSigner,
  LedgerTxTransformerContext
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
      path: paymentKeyPath,
      type: Ledger.TxRequiredSignerType.PATH,
    };
  }

  if (stakeKeyPath) {
    return {
      path: stakeKeyPath,
      type: Ledger.TxRequiredSignerType.PATH,
    };
  }

  return {
    hashHex: keyHash,
    type: Ledger.TxRequiredSignerType.HASH,
  };
};

export const mapRequiredSigners = (
  signers: Crypto.Ed25519KeyHashHex[] | undefined,
  context: LedgerTxTransformerContext,
): Ledger.RequiredSigner[] | null =>
  signers ? signers.map(signer => toRequiredSigner(signer, context)) : null;
