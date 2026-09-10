import { Cardano } from '@cardano-sdk/core';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import {
  getBlockfrostClient,
  BlockfrostAddressDiscovery,
  BlockfrostUtxoProvider,
  BlockfrostNetworkInfoProvider,
  BlockfrostTxProvider,
  BlockfrostTxSubmitProvider,
  BlockfrostRewardsProvider,
  type BlockfrostConfig,
} from '@lace-lib/cardano-provider-core';
import { BigNumber } from '@lace-lib/util';
import { isNotFoundError, isRetriableError } from '@lace-lib/util-provider';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';

import { POLL_TRIES, pollForValue } from '../util/poll';

import type { Observable } from 'rxjs';

/** Blockfrost providers for a network. The caller supplies the config (host and project id). */
export const makeProviders = (config: BlockfrostConfig) => {
  const client = getBlockfrostClient(config);
  return {
    utxo: new BlockfrostUtxoProvider(client, dummyLogger),
    addressDiscovery: new BlockfrostAddressDiscovery(client, dummyLogger),
    networkInfo: new BlockfrostNetworkInfoProvider(client, dummyLogger),
    tx: new BlockfrostTxProvider(client, dummyLogger),
    txSubmit: new BlockfrostTxSubmitProvider(client, dummyLogger),
    rewards: new BlockfrostRewardsProvider(client, dummyLogger),
  };
};

export type Providers = ReturnType<typeof makeProviders>;

/** Sums the lovelace (coins) across a set of utxos. */
export const lovelaceTotal = (utxos: Cardano.Utxo[]): bigint =>
  utxos.reduce((total, [, out]) => total + out.value.coins, 0n);

/** Takes the first emission of a provider observable and unwraps its Result. */
const unwrapFirst = async <T>(
  obs: Observable<{ unwrap: () => T }>,
): Promise<T> => (await firstValueFrom(obs)).unwrap();

const rewardAccountInfo = async (
  providers: Providers,
  rewardAccount: Cardano.RewardAccount,
) =>
  unwrapFirst(
    providers.rewards.getRewardAccountInfo({
      rewardAccount: CardanoRewardAccount(rewardAccount),
    }),
  );

const transactionById = async (providers: Providers, txId: string) =>
  providers.tx.getTransaction(Cardano.TransactionId(txId));

/** Unspent outputs currently sitting at an address. */
export const getUtxos = async (
  providers: Providers,
  address: Cardano.PaymentAddress,
): Promise<Cardano.Utxo[]> =>
  unwrapFirst(
    providers.utxo.getUtxosAtAddress({
      address: CardanoPaymentAddress(address),
    }),
  );

/** Whether the stake key behind a reward account is currently registered. */
export const stakeKeyRegistered = async (
  providers: Providers,
  rewardAccount: Cardano.RewardAccount,
): Promise<boolean> =>
  (await rewardAccountInfo(providers, rewardAccount)).isRegistered;

/** Withdrawable rewards currently accrued to a reward account, in lovelace. */
export const withdrawableRewards = async (
  providers: Providers,
  rewardAccount: Cardano.RewardAccount,
): Promise<bigint> =>
  BigNumber.valueOf(
    (await rewardAccountInfo(providers, rewardAccount)).withdrawableAmount,
  );

/**
 * The fee of a confirmed tx, read back from the chain. The /txs index can lag
 * the address-utxo index just after a sweep confirms, so this polls past the
 * NOT_FOUND race and transient provider errors rather than failing on them.
 */
export const confirmedTxFee = async (
  providers: Providers,
  txId: string,
): Promise<bigint> =>
  pollForValue(
    async () => BigInt((await transactionById(providers, txId)).fees),
    error => isNotFoundError(error) || isRetriableError(error),
    `tx ${txId} not indexed after ${POLL_TRIES} tries`,
  );
