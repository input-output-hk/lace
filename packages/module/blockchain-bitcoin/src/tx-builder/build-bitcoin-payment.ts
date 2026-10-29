import { ActivityType } from '@lace-contract/activities';
import { Transaction } from 'bitcoinjs-lib';
import { firstValueFrom, forkJoin } from 'rxjs';

import { encodeUnsignedTxToString } from '../common';

import { BitcoinTxBuildError, BitcoinTxBuildErrorCode } from './errors';
import { TransactionBuilder } from './TransactionBuilder';

import type { BitcoinWallet } from '../wallet';
import type { ProviderError } from '@cardano-sdk/core';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
import type {
  BitcoinBlockchainSpecificTxData,
  BitcoinEstimatedFees,
  BitcoinInFlightUtxoActivityMetadata,
  BitcoinUTxO,
} from '@lace-contract/bitcoin-context';
import type { HexBytes, Result } from '@lace-lib/util';
import type { Psbt } from 'bitcoinjs-lib';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * A single recipient of a Bitcoin payment.
 */
export type BitcoinPaymentOutput = {
  /** The recipient address. */
  address: string;
  /** The amount sent to the recipient, in satoshis. */
  amount: number;
};

/**
 * Everything needed to build an unsigned Bitcoin payment for one account.
 */
export type BuildBitcoinPaymentParams = {
  /** The account wallet that funds the payment and receives the change. */
  wallet: BitcoinWallet;
  /** Pending activities of the account, whose consumed outpoints are not spent again. */
  pendingActivities: readonly Activity[];
  /** The recipients of the payment. */
  outputs: readonly BitcoinPaymentOutput[];
  /** The chosen fee option, plus the typed rate when it is `Custom`. */
  feeRate: BitcoinBlockchainSpecificTxData['feeRate'];
  /** Optional message embedded in an OP_RETURN output. */
  memo?: string;
  /** Optional logger that traces the resolved fee rate, outputs and memo. */
  logger?: Logger;
};

/**
 * An unsigned Bitcoin payment ready to be signed.
 */
export type BitcoinPayment = {
  /** The unsigned transaction, serialized for the signers. */
  serializedTx: HexBytes;
  /** The network fee paid by the transaction, in satoshis. */
  fee: bigint;
};

const getBitcoinInFlight = (
  activity: Activity,
): BitcoinInFlightUtxoActivityMetadata | undefined => {
  if (activity.type !== ActivityType.Pending) return undefined;
  const blockchainSpecific = activity.blockchainSpecific as
    | BlockchainSpecificActivityMetadata
    | undefined;
  return blockchainSpecific?.Bitcoin;
};

const outpointKey = (ref: { txId: string; index: number }) =>
  `${ref.txId}#${ref.index}`;

/**
 * Drops the outpoints consumed by pending transactions from the spendable set.
 * Unconfirmed outputs produced by those transactions are not added: spending
 * unconfirmed Bitcoin outputs is unsafe under RBF and bounded by mempool
 * ancestor limits.
 *
 * @param utxos - The confirmed UTxOs of the account.
 * @param _accountAddresses - The addresses of the account.
 * @param pendingActivities - The pending activities of the account.
 */
export const applyInFlightUtxoAdjustments = (
  utxos: readonly BitcoinUTxO[],
  _accountAddresses: ReadonlySet<string>,
  pendingActivities: readonly Activity[],
): BitcoinUTxO[] => {
  const spent = new Set<string>();
  for (const activity of pendingActivities) {
    const inFlight = getBitcoinInFlight(activity);
    if (!inFlight) continue;
    for (const input of inFlight.consumedInputs) {
      spent.add(outpointKey(input));
    }
  }

  if (spent.size === 0) return [...utxos];

  return utxos.filter(utxo => !spent.has(outpointKey(utxo)));
};

/**
 * Resolves the rate to build against, in BTC per kilobyte.
 *
 * The market is read ONLY for the three quoted tiers. `Custom` is a rate the
 * user typed and must stay buildable while mempool.space is unreachable, so
 * the fetch must not be hoisted above that branch, or an unreachable market
 * fails every Bitcoin build. A tier build still fails when the market cannot
 * be read.
 *
 * @param feeRate - The chosen option, plus the typed rate when it is `Custom`.
 * @param getCurrentFeeMarket - Fetches the market; called only for a tier.
 */
const resolveFeeRate = async (
  feeRate: BitcoinBlockchainSpecificTxData['feeRate'],
  getCurrentFeeMarket: () => Observable<
    Result<BitcoinEstimatedFees, ProviderError>
  >,
): Promise<number> => {
  if (feeRate.feeOption === 'Custom') return feeRate.customFeeRate ?? 0.0;

  const market = (await firstValueFrom(getCurrentFeeMarket())).unwrap();

  switch (feeRate.feeOption) {
    case 'Fast':
      return market.fast.feeRate;
    case 'Average':
      return market.standard.feeRate;
    case 'Low':
      return market.slow.feeRate;
  }
};

/**
 * Embeds each input's full previous transaction (nonWitnessUtxo) into the
 * PSBT so it is self-contained for hardware signers: Ledger requires the
 * previous transaction for segwit-v0 inputs and Trezor consumes it as refTxs.
 * Duplicate previous transactions are fetched only once and all fetches run
 * concurrently. Each fetched transaction is verified to hash to the requested
 * txid so a wrong provider response fails the build locally instead of as an
 * opaque device-side rejection. Throws if any fetch fails, failing the build
 * instead of producing a PSBT a device would reject.
 *
 * @param psbt - The freshly built PSBT whose inputs carry only witnessUtxo.
 * @param getRawTransaction - Fetches the raw transaction hex for a tx id.
 */
const embedPreviousTransactions = async (
  psbt: Psbt,
  getRawTransaction: (
    txId: string,
  ) => Observable<Result<string, ProviderError>>,
): Promise<void> => {
  const inputTxIds = psbt.txInputs.map(input =>
    Buffer.from(input.hash).reverse().toString('hex'),
  );

  const uniqueTxIds = [...new Set(inputTxIds)];
  if (uniqueTxIds.length === 0) return;

  const rawTxResults = await firstValueFrom(
    forkJoin(uniqueTxIds.map(txId => getRawTransaction(txId))),
  );

  const rawTxByTxId = new Map<string, Buffer>();
  uniqueTxIds.forEach((txId, index) => {
    const rawTx = Buffer.from(rawTxResults[index].unwrap(), 'hex');
    if (Transaction.fromBuffer(rawTx).getId() !== txId) {
      throw new Error(
        `Fetched previous transaction does not match requested txid ${txId}`,
      );
    }
    rawTxByTxId.set(txId, rawTx);
  });

  inputTxIds.forEach((txId, index) => {
    psbt.updateInput(index, { nonWitnessUtxo: rawTxByTxId.get(txId)! });
  });
};

/**
 * Builds an unsigned Bitcoin payment from the account wallet's current UTxOs
 * and addresses. Outpoints consumed by pending activities are not spent
 * again, change goes to the wallet address, and hardware accounts (those with
 * a master fingerprint) get each input's previous transaction embedded.
 *
 * @param params - The wallet, pending activities, recipients, fee option and memo.
 * @returns The serialized unsigned transaction and the fee it pays.
 * @throws {@link BitcoinTxBuildError} when the payment cannot be built, for example
 * when the fee rate is not positive or the funds do not cover it.
 */
export const buildBitcoinPayment = async ({
  wallet,
  pendingActivities,
  outputs,
  feeRate,
  memo,
  logger,
}: BuildBitcoinPaymentParams): Promise<BitcoinPayment> => {
  const network = wallet.network;
  const utxos = await firstValueFrom(wallet.utxos$);
  const addresses = await firstValueFrom(wallet.addresses$);

  const rateToUse = await resolveFeeRate(feeRate, () =>
    wallet.getCurrentFeeMarket(),
  );

  if (!Number.isFinite(rateToUse) || rateToUse <= 0) {
    throw new BitcoinTxBuildError(
      BitcoinTxBuildErrorCode.InvalidFeeRate,
      `Invalid fee rate: ${rateToUse}`,
    );
  }

  logger?.debug(`Bitcoin buildTx: Using fee rate of ${rateToUse} BTC/kB`);
  const txBuilder = new TransactionBuilder(network, rateToUse, addresses);

  const ownAddresses = new Set(addresses.map(a => a.address));
  const adjustedUtxos = applyInFlightUtxoAdjustments(
    utxos,
    ownAddresses,
    pendingActivities,
  );

  txBuilder
    .setChange(wallet.address, wallet.masterFingerprint)
    .setUtxoSet(adjustedUtxos);

  for (const output of outputs) {
    txBuilder.addOutput(output.address, output.amount);
    logger?.debug(
      `Bitcoin buildTx: Adding output to address: ${output.address} with amount from txParams: ${output.amount}`,
    );
  }

  if (memo) {
    logger?.debug(`Bitcoin buildTx: Adding OP_RETURN memo: ${memo}`);
    txBuilder.addOpReturnOutput(memo);
  }

  const tx = txBuilder.build();
  tx.network = network;

  if (wallet.masterFingerprint) {
    await embedPreviousTransactions(tx.context, txId =>
      wallet.getRawTransaction(txId),
    );
  }

  return {
    serializedTx: encodeUnsignedTxToString(tx),
    fee: BigInt(tx.fee),
  };
};
