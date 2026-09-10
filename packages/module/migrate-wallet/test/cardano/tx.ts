import { Cardano } from '@cardano-sdk/core';
import { TransactionBuilder } from '@lace-contract/cardano-context';

import { POLL_TRIES, pollUntil } from '../util/poll';

import { getUtxos } from './queries';
import { signTx } from './signing';

import type { DerivedAccount } from './account';
import type { Providers } from './queries';
import type { Serialization } from '@cardano-sdk/core';

/** Builds, signs, submits, and confirms a simple ADA transfer. Returns the tx id. */
export const sendAda = async (
  providers: Providers,
  {
    from,
    to,
    lovelace,
  }: { from: DerivedAccount; to: Cardano.PaymentAddress; lovelace: bigint },
): Promise<Cardano.TransactionId> => {
  const protocolParameters = await providers.networkInfo.protocolParameters();
  const utxos = await getUtxos(providers, from.address);
  const tx = await new TransactionBuilder(
    from.chainId.networkMagic,
    protocolParameters,
  )
    .setChangeAddress(from.address)
    .setUnspentOutputs(utxos)
    .transferValue(to, { coins: lovelace })
    .build();
  const signed = await signTx(from, tx, utxos);
  return submitAndConfirm(providers, signed, to);
};

/**
 * Registers the stake key, delegates to a pool (for reward accrual), and
 * vote-delegates to abstain (so a later withdrawal passes the Conway
 * ConwayWdrlNotDelegatedToDRep check). One tx, signed by the account. The account
 * must already hold enough ADA for the 2 ADA deposit plus fees.
 */
export const registerAndDelegate = async (
  providers: Providers,
  {
    account,
    poolId,
    dRep = { __typename: 'AlwaysAbstain' },
  }: {
    account: DerivedAccount;
    poolId: Cardano.PoolId;
    // Vote-delegation target. AlwaysAbstain (default) makes rewards withdrawable.
    // A real DRep credential leaves them blocked for the single-tx sweep.
    dRep?: Cardano.DelegateRepresentative;
  },
): Promise<Cardano.TransactionId> => {
  const protocolParameters = await providers.networkInfo.protocolParameters();
  const utxos = await getUtxos(providers, account.address);
  const stakeCredential: Cardano.Credential = {
    type: Cardano.CredentialType.KeyHash,
    hash: Cardano.RewardAccount.toHash(account.rewardAccount),
  };
  const tx = await new TransactionBuilder(
    account.chainId.networkMagic,
    protocolParameters,
  )
    .setChangeAddress(account.address)
    .setUnspentOutputs(utxos)
    .addStakeRegistrationDelegationCertificate(
      poolId,
      stakeCredential,
      BigInt(protocolParameters.stakeKeyDeposit),
    )
    .addVoteDelegationCertificate(stakeCredential, dRep)
    .build();
  const signed = await signTx(account, tx, utxos);
  return submitAndConfirm(providers, signed, account.address);
};

/**
 * Deregisters a registered stake key, sweeping the account's funds plus the
 * reclaimed deposit back to `to` in one tx. A registered-but-empty account past
 * index 0 still counts active to the live scan (registered stake key), so
 * draining funds alone does not restore the single-account invariant. This does.
 */
export const deregisterStakeKey = async (
  providers: Providers,
  { account, to }: { account: DerivedAccount; to: Cardano.PaymentAddress },
): Promise<Cardano.TransactionId> => {
  const protocolParameters = await providers.networkInfo.protocolParameters();
  const utxos = await getUtxos(providers, account.address);
  const stakeCredential: Cardano.Credential = {
    type: Cardano.CredentialType.KeyHash,
    hash: Cardano.RewardAccount.toHash(account.rewardAccount),
  };
  const tx = await new TransactionBuilder(
    account.chainId.networkMagic,
    protocolParameters,
  )
    .setChangeAddress(to)
    .setUnspentOutputs(utxos)
    .addStakeDeregistrationCertificate(
      stakeCredential,
      BigInt(protocolParameters.stakeKeyDeposit),
    )
    .build();
  const signed = await signTx(account, tx, utxos);
  return submitAndConfirm(providers, signed, to);
};

/** Submits a signed tx and polls until a utxo it creates lands at `watchAddress`. */
export const submitAndConfirm = async (
  providers: Providers,
  signedTx: Serialization.Transaction,
  watchAddress: Cardano.PaymentAddress,
): Promise<Cardano.TransactionId> => {
  const txId = signedTx.getId();
  await providers.txSubmit.submitTx({ signedTransaction: signedTx.toCbor() });
  await pollUntil(
    async () =>
      (
        await getUtxos(providers, watchAddress)
      ).some(([txIn]) => txIn.txId === txId),
    `tx ${txId} not confirmed after ${POLL_TRIES} tries`,
  );
  return txId;
};

/**
 * Sends `from`'s balance to `to` in one change-only tx, spending every utxo.
 * Returns the tx id, or undefined when `from` is empty. One tx only, and no
 * size pre-check: build() does not enforce maxTxSize, so an over-large drain
 * builds and signs, then submit rejects it.
 */
export const returnFunds = async (
  providers: Providers,
  {
    from,
    to,
  }: {
    from: DerivedAccount;
    to: Cardano.PaymentAddress;
  },
): Promise<Cardano.TransactionId | undefined> => {
  const utxos = await getUtxos(providers, from.address);
  if (utxos.length === 0) return undefined;
  const protocolParameters = await providers.networkInfo.protocolParameters();
  const builder = new TransactionBuilder(
    from.chainId.networkMagic,
    protocolParameters,
  ).setChangeAddress(to);
  // Every utxo as an explicit input, never setUnspentOutputs: coin selection
  // stops once the fee is covered, so a pure-ADA utxo big enough to pay on its
  // own leaves the asset-bearing ones behind. Same input-forcing as the
  // production sweep, which additionally sets a TTL this does not need.
  for (const utxo of utxos) builder.addInput(utxo);
  const tx = await builder.build();
  const signed = await signTx(from, tx, utxos);
  return submitAndConfirm(providers, signed, to);
};
