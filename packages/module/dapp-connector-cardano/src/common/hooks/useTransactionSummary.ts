import { Serialization } from '@cardano-sdk/core';
import { useEffect, useMemo, useState } from 'react';

import { txInEquals } from '../store/utils/input-resolver';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Value transferred to/from an address in a transaction.
 * Contains the total coins (lovelace) and any native assets.
 */
export interface TokenTransferValue {
  /** Total lovelace being transferred */
  coins: bigint;
  /** Native assets being transferred, keyed by asset ID */
  assets: Map<Cardano.AssetId, bigint>;
}

/**
 * Summary of a Cardano transaction with resolved input addresses.
 * Used to display accurate "from" and "to" information in the UI.
 */
export interface TransactionSummary {
  /** Map of addresses sending funds in this transaction */
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  /** Map of addresses receiving funds in this transaction */
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  /** Transaction fee in lovelace */
  fee: bigint;
  /** Whether the summary is still being computed */
  isLoading: boolean;
  /** Error message if resolution failed */
  error: string | null;
  /** Number of inputs that could not be resolved (foreign inputs) */
  unresolvedInputCount: number;
}

/**
 * Parameters for computing a transaction summary.
 */
export interface ComputeTransactionSummaryParams {
  /** Transaction CBOR hex string */
  txHex: string;
  /** Flattened array of all UTXOs for local input resolution */
  allUtxos: Cardano.Utxo[];
  /** Current chain ID for context */
  chainId: Cardano.ChainId | undefined;
}

/**
 * Parameters for the useTransactionSummary hook.
 */
interface UseTransactionSummaryParams {
  /** Transaction CBOR hex string */
  txHex: string;
  /** Map of account ID to UTXOs for local input resolution */
  accountUtxos: Record<string, Cardano.Utxo[]>;
  /** Current chain ID for context */
  chainId: Cardano.ChainId | undefined;
}

/**
 * Aggregates value into an existing TokenTransferValue or creates a new one.
 *
 * @param existingValue - Current aggregated value for the address
 * @param txOut - Transaction output to add
 * @returns Updated TokenTransferValue with aggregated amounts
 */
const aggregateValue = (
  existingValue: TokenTransferValue | undefined,
  txOut: Cardano.TxOut,
): TokenTransferValue => {
  const coins = (existingValue?.coins ?? BigInt(0)) + txOut.value.coins;
  const assets = new Map(existingValue?.assets ?? []);

  if (txOut.value.assets) {
    for (const [assetId, amount] of txOut.value.assets) {
      const existingAmount = assets.get(assetId) ?? BigInt(0);
      assets.set(assetId, existingAmount + amount);
    }
  }

  return { coins, assets };
};

/**
 * Resolves a transaction input using local UTXOs.
 *
 * @param txIn - Transaction input to resolve
 * @param allUtxos - All known UTXOs from local wallet
 * @returns Resolved transaction output or null if not found locally
 */
const resolveInputLocally = (
  txIn: Cardano.TxIn,
  allUtxos: Cardano.Utxo[],
): Cardano.TxOut | null => {
  const match = allUtxos.find(([utxoInput]) => txInEquals(utxoInput, txIn));
  return match ? match[1] : null;
};

/**
 * Pure function that computes a transaction summary from CBOR and UTXOs.
 *
 * This function parses a transaction CBOR and resolves its inputs using local UTXOs
 * to determine the actual "from" addresses (UTXOs being spent). It aggregates
 * coins and assets by address for both inputs (from) and outputs (to).
 *
 * @param params - Parameters including txHex, allUtxos, and chainId
 * @returns TransactionSummary with fromAddresses, toAddresses, fee, and status
 */
export const computeTransactionSummary = ({
  txHex,
  allUtxos,
  chainId,
}: ComputeTransactionSummaryParams): TransactionSummary => {
  if (!txHex) {
    return {
      fromAddresses: new Map(),
      toAddresses: new Map(),
      fee: BigInt(0),
      isLoading: false,
      error: 'No transaction data provided',
      unresolvedInputCount: 0,
    };
  }

  if (!chainId) {
    return {
      fromAddresses: new Map(),
      toAddresses: new Map(),
      fee: BigInt(0),
      isLoading: false,
      error: 'Chain ID not available',
      unresolvedInputCount: 0,
    };
  }

  try {
    const tx = Serialization.Transaction.fromCbor(Serialization.TxCBOR(txHex));
    const body = tx.body().toCore();

    const fromAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>();
    let unresolvedInputCount = 0;

    for (const txIn of body.inputs) {
      const resolvedOutput = resolveInputLocally(txIn, allUtxos);
      if (resolvedOutput) {
        const address = resolvedOutput.address;
        fromAddresses.set(
          address,
          aggregateValue(fromAddresses.get(address), resolvedOutput),
        );
      } else {
        unresolvedInputCount++;
      }
    }

    const toAddresses = new Map<Cardano.PaymentAddress, TokenTransferValue>();
    for (const output of body.outputs) {
      const address = output.address;
      toAddresses.set(
        address,
        aggregateValue(toAddresses.get(address), output),
      );
    }

    return {
      fromAddresses,
      toAddresses,
      fee: body.fee,
      isLoading: false,
      error: null,
      unresolvedInputCount,
    };
  } catch (error) {
    return {
      fromAddresses: new Map(),
      toAddresses: new Map(),
      fee: BigInt(0),
      isLoading: false,
      error:
        error instanceof Error ? error.message : 'Failed to parse transaction',
      unresolvedInputCount: 0,
    };
  }
};

/**
 * Hook that resolves transaction inputs and computes from/to address maps.
 *
 * This hook parses a transaction CBOR and resolves its inputs using local UTXOs
 * to determine the actual "from" addresses (UTXOs being spent). It aggregates
 * coins and assets by address for both inputs (from) and outputs (to).
 *
 * For inputs that cannot be resolved locally (e.g., multi-sig scenarios with
 * foreign inputs), the hook tracks the count of unresolved inputs.
 *
 * @param params - Parameters including txHex, accountUtxos, and chainId
 * @returns TransactionSummary with fromAddresses, toAddresses, fee, and status
 */
export const useTransactionSummary = ({
  txHex,
  accountUtxos,
  chainId,
}: UseTransactionSummaryParams): TransactionSummary => {
  const [summary, setSummary] = useState<TransactionSummary>({
    fromAddresses: new Map(),
    toAddresses: new Map(),
    fee: BigInt(0),
    isLoading: true,
    error: null,
    unresolvedInputCount: 0,
  });

  const allUtxos = useMemo((): Cardano.Utxo[] => {
    return Object.values(accountUtxos).flat();
  }, [accountUtxos]);

  useEffect(() => {
    setSummary(computeTransactionSummary({ txHex, allUtxos, chainId }));
  }, [txHex, allUtxos, chainId]);

  return summary;
};
