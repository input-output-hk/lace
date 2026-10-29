import {
  CardanoPaymentAddress,
  classifyCardanoCustodyAccount,
  utxoKey,
  verifyCardanoCustodyAccountIdentity,
} from '@lace-contract/cardano-context';
import { createCustodyAccountRecord } from '@lace-lib/cardano-custody';

import { failCustodyBuild } from './build-failure';
import { readFromProvider } from './custody-chain';

import type { CustodyChain } from './custody-chain';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyAccount,
  CardanoCustodyAccountState,
  CardanoCustodyDeviceBinding,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  CustodyAccountIdentity,
  CustodyAccountRecord,
  CustodyAccountState,
  CustodyGrantUtxo,
} from '@lace-lib/cardano-custody';

/** What the synced store knows about one custody account. */
export interface CustodyAccountSnapshot {
  readonly account: CardanoCustodyAccount | undefined;
  /** The classification over the in-flight view. */
  readonly accountState: CardanoCustodyAccountState | undefined;
  /** The account's confirmed UTxOs, without in-flight adjustments. */
  readonly settledUtxos: readonly Cardano.Utxo[];
}

/** A live custody account as the chain holds it right now. */
export interface CustodyAccountContext {
  readonly accountId: AccountId;
  readonly identity: CustodyAccountIdentity;
  readonly record: CustodyAccountRecord;
  readonly device: CardanoCustodyDeviceBinding | undefined;
  readonly control: Cardano.Utxo;
  readonly state: CustodyAccountState;
  /**
   * Plain fund UTxOs, no account token and no datum, that no unsettled
   * transaction of this wallet spends. Agents and devices spend them.
   */
  readonly funds: readonly Cardano.Utxo[];
  /**
   * Reserves in the format Lace writes, the inline datum `d87980` and no
   * reference script, that no unsettled transaction of this wallet spends.
   * Only a device spends them. Reserves in any other format are never
   * selected: their datum or reference script makes every spend dearer.
   */
  readonly reserves: readonly Cardano.Utxo[];
  /** Every grant UTxO of the account, in slot order. */
  readonly grants: readonly CustodyGrantUtxo[];
  /**
   * The outpoints of the account's UTxOs an unsettled transaction of this
   * wallet spends, as `txId#index`.
   */
  readonly spentInFlight: ReadonlySet<string>;
}

type LiveAccountState = Extract<CardanoCustodyAccountState, { status: 'live' }>;

/** Every UTxO the classification of a live account holds. */
const utxosOf = (state: LiveAccountState): Cardano.Utxo[] => [
  state.controlUtxo,
  ...state.funds,
  ...state.reserves.own,
  ...state.reserves.foreign,
  ...state.grants.map(({ utxo }) => utxo),
  ...state.stranded,
  ...state.anomalies.map(({ utxo }) => utxo),
];

/**
 * Resolves the account an operation runs on. The synced view must show it
 * live with a confirmed control UTxO, and the chain, read again now, must
 * hold that same control UTxO. Funds, reserves and grants come from that
 * fresh read, so a UTxO already spent on chain or still unconfirmed is never
 * selected; funds and reserves an unsettled transaction of this wallet
 * spends are left out too, so concurrent builds pick disjoint ones.
 *
 * Owner operations are never chained: while the synced control UTxO is the
 * output of a submitted transaction that has not settled, the build is
 * refused.
 */
export const resolveCustodyAccount = async (
  accountId: AccountId,
  snapshot: CustodyAccountSnapshot,
  chain: CustodyChain,
): Promise<CustodyAccountContext> => {
  const { account, accountState, settledUtxos } = snapshot;
  if (
    !account ||
    account.blockchainSpecific.chainId.networkMagic !==
      chain.chainId.networkMagic
  ) {
    return failCustodyBuild({ code: 'unknown-account' });
  }
  const identity = verifyCardanoCustodyAccountIdentity(
    account.blockchainSpecific,
  );
  if (!identity.ok) return failCustodyBuild({ code: 'unknown-account' });
  if (accountState?.status !== 'live') {
    return failCustodyBuild({
      code: 'account-not-live',
      status: accountState?.status ?? 'unsynced',
    });
  }
  const controlKey = utxoKey(accountState.controlUtxo);
  if (!settledUtxos.some(utxo => utxoKey(utxo) === controlKey)) {
    return failCustodyBuild({ code: 'operation-in-progress' });
  }

  const onChain = classifyCardanoCustodyAccount({
    account: account.blockchainSpecific,
    utxos: await readFromProvider('Custody account UTxOs', () =>
      chain.provider.getUtxosAtAddress(
        {
          address: CardanoPaymentAddress(identity.value.address),
          withReferenceScripts: true,
        },
        { chainId: chain.chainId },
      ),
    ),
    withdrawableRewards: 0n,
    protocolParameters: chain.protocolParameters,
  });
  if (
    onChain.status !== 'live' ||
    utxoKey(onChain.controlUtxo) !== controlKey
  ) {
    return failCustodyBuild({ code: 'stale-control' });
  }

  const inFlight = new Set(utxosOf(accountState).map(utxoKey));
  const spentInFlight = new Set(
    settledUtxos.map(utxoKey).filter(key => !inFlight.has(key)),
  );
  const isUnspent = (utxo: Cardano.Utxo) => !spentInFlight.has(utxoKey(utxo));
  return {
    accountId,
    identity: identity.value,
    record: createCustodyAccountRecord(identity.value),
    device: account.blockchainSpecific.device,
    control: onChain.controlUtxo,
    state: onChain.state,
    funds: onChain.funds.filter(isUnspent),
    reserves: onChain.reserves.own.filter(isUnspent),
    grants: onChain.grants,
    spentInFlight,
  };
};

/**
 * The device key that signs an owner operation: the bound device, listed in
 * the current state. An observer holds no device and no owner authority.
 */
export const requireListedDevice = ({
  device,
  state,
}: CustodyAccountContext): Ed25519KeyHashHex => {
  if (!device) return failCustodyBuild({ code: 'observer-account' });
  const keyHash = device.keyHash.toLowerCase();
  return state.devices.some(listed => listed.toLowerCase() === keyHash)
    ? device.keyHash
    : failCustodyBuild({ code: 'device-not-listed', keyHash: device.keyHash });
};
