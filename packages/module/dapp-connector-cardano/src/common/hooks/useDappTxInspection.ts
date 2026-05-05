import {
  Cardano,
  Milliseconds,
  Serialization,
  createTxInspector,
  tokenTransferInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dummyLogger } from 'ts-log';

import { createDappAssetProvider } from '../utils/create-dapp-asset-provider';
import { createDappInputResolver } from '../utils/create-dapp-input-resolver';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';

import type {
  TokenTransferValue as SdkTokenTransferValue,
  TransactionSummaryInspection,
} from '@cardano-sdk/core';

const TIMEOUT = Milliseconds(6000);

export type TokenTransferValue = {
  coins: bigint;
  assets: Map<Cardano.AssetId, bigint>;
};

export interface UseDappTxInspectionResult {
  isLoading: boolean;
  error: string | null;
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  summary: TransactionSummaryInspection | null;
}

const EMPTY: UseDappTxInspectionResult = {
  isLoading: false,
  error: null,
  fromAddresses: new Map(),
  toAddresses: new Map(),
  summary: null,
};

const toV2TokenTransferValue = (
  entry: SdkTokenTransferValue,
): TokenTransferValue => {
  const assets = new Map<Cardano.AssetId, bigint>();
  for (const [assetId, { amount }] of entry.assets) {
    assets.set(assetId, amount);
  }
  return { coins: entry.coins, assets };
};

/**
 * Filter the `from`/`to` maps from `tokenTransferInspector` so only assets
 * actually leaving the wallet — or moving to/from addresses outside it —
 * appear in the UI's From/To sections.
 *
 * Own addresses are treated as a single "your wallet" unit: the inputs they
 * contribute and the outputs they receive are summed and netted against each
 * other. For a certificate-only transaction that spends a UTXO and sends
 * change back to a (possibly different) own address, this collapses to a
 * single From entry of `fee + deposit` ADA with no assets — everything else
 * stayed inside the wallet. Foreign addresses are kept per-address since
 * they always represent value "changing address".
 */
export const computeNetFlows = (
  fromRaw: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  toRaw: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  ownAddresses: readonly Cardano.PaymentAddress[],
): {
  from: Map<Cardano.PaymentAddress, TokenTransferValue>;
  to: Map<Cardano.PaymentAddress, TokenTransferValue>;
} => {
  const ownSet = new Set(ownAddresses);
  const from = new Map<Cardano.PaymentAddress, TokenTransferValue>();
  const to = new Map<Cardano.PaymentAddress, TokenTransferValue>();

  // SDK fromRaw entries carry signed net values (negative coins = net outflow).
  // Preserve the sign from the inspector so callers can reason about direction.
  for (const [address, entry] of fromRaw) {
    if (!ownSet.has(address)) from.set(address, toV2TokenTransferValue(entry));
  }
  for (const [address, entry] of toRaw) {
    if (!ownSet.has(address)) to.set(address, toV2TokenTransferValue(entry));
  }

  // The SDK's tokenTransferInspector uses signed net values:
  //   fromAddress entries have negative coins (net outflow from that address)
  //   toAddress entries have positive coins (net inflow to that address)
  // Accumulate both maps directly — the sign is already encoded in entry.coins.
  let walletNetCoins = 0n;
  const walletNetAssets = new Map<Cardano.AssetId, bigint>();
  let representative: Cardano.PaymentAddress | undefined;

  const accumulateOwn = (
    entries: Map<Cardano.PaymentAddress, SdkTokenTransferValue>,
  ) => {
    for (const [address, entry] of entries) {
      if (!ownSet.has(address)) continue;
      if (representative === undefined) representative = address;
      walletNetCoins += entry.coins;
      for (const [assetId, { amount }] of entry.assets) {
        walletNetAssets.set(
          assetId,
          (walletNetAssets.get(assetId) ?? 0n) + amount,
        );
      }
    }
  };
  accumulateOwn(fromRaw);
  accumulateOwn(toRaw);

  if (representative === undefined) return { from, to };

  // negative net = wallet is sender; positive net = wallet is receiver
  // Asset amounts and coin amounts preserve the sign so callers can reason about direction.
  const leavingAssets = new Map<Cardano.AssetId, bigint>();
  const incomingAssets = new Map<Cardano.AssetId, bigint>();
  for (const [assetId, net] of walletNetAssets) {
    if (net < 0n) leavingAssets.set(assetId, net);
    else if (net > 0n) incomingAssets.set(assetId, net);
  }

  if (walletNetCoins < 0n || leavingAssets.size > 0) {
    from.set(representative, {
      coins: walletNetCoins < 0n ? walletNetCoins : 0n,
      assets: leavingAssets,
    });
  }
  if (walletNetCoins > 0n || incomingAssets.size > 0) {
    to.set(representative, {
      coins: walletNetCoins > 0n ? walletNetCoins : 0n,
      assets: incomingAssets,
    });
  }

  return { from, to };
};

/**
 * Mirrors v1 `DappTransactionContainer`'s inspector pipeline:
 *
 *  - parses the tx CBOR once (`Serialization.Transaction.fromCbor(...).toCore()`)
 *  - builds a `Cardano.InputResolver` backed by local UTXOs + pre-resolved
 *    foreign inputs (stored as CBOR in the `cardanoDappConnector` slice)
 *  - builds an `AssetProvider` that layers the `tokens` slice cache with
 *    mint-witness synthesis / CIP-68 / CIP-25 metadata
 *  - runs `createTxInspector({ tokenTransfer, summary })`
 *
 * The hook returns the `from`/`to` address breakdown and the full
 * `TransactionSummaryInspection` so the UI can derive collateral, deposit,
 * returnedDeposit, fee, and unresolved value from the same SDK-computed
 * numbers v1 relies on.
 */
export const useDappTxInspection = ({
  txHex,
}: {
  txHex: string;
}): UseDappTxInspectionResult => {
  const accountUtxos = useLaceSelector('cardanoContext.selectAccountUtxos');
  const protocolParameters = useLaceSelector(
    'cardanoContext.selectProtocolParameters',
  );
  const resolvedTransactionInputs = useLaceSelector(
    'cardanoDappConnector.selectResolvedTransactionInputs',
  );
  const tokensMetadata = useLaceSelector('tokens.selectTokensMetadata');
  const tokensMetadataRef = useRef(tokensMetadata);
  tokensMetadataRef.current = tokensMetadata;
  const allAddresses = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );
  const dispatchLoadTokenMetadata = useDispatchLaceAction(
    'cardanoContext.loadTokenMetadata',
  );

  const [result, setResult] = useState<UseDappTxInspectionResult>({
    ...EMPTY,
    isLoading: Boolean(txHex),
  });

  const ownAddresses = useMemo(
    () => allAddresses.map(a => a.address as unknown as Cardano.PaymentAddress),
    [allAddresses],
  );
  const rewardAccounts = useMemo(() => {
    const unique = new Set<string>();
    for (const addr of allAddresses) {
      const ra = (addr as unknown as { data?: { rewardAccount?: string } }).data
        ?.rewardAccount;
      if (ra) unique.add(ra);
    }
    return [...unique].map(ra => Cardano.RewardAccount(ra));
  }, [allAddresses]);

  const allUtxos = useMemo((): Cardano.Utxo[] => {
    return Object.values(accountUtxos).flat();
  }, [accountUtxos]);

  const coreTx = useMemo(() => {
    if (!txHex) return null;
    try {
      return Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(txHex),
      ).toCore();
    } catch {
      return null;
    }
  }, [txHex]);

  useEffect(() => {
    if (!txHex) {
      setResult({ ...EMPTY });
      return;
    }
    if (!coreTx) {
      setResult({
        ...EMPTY,
        isLoading: false,
        error: 'Failed to parse transaction',
      });
      return;
    }
    if (!protocolParameters) {
      // Keep loading — summary inspector requires protocol parameters.
      setResult(previous => ({ ...previous, isLoading: true }));
      return;
    }
    if (resolvedTransactionInputs?.isResolving) {
      setResult(previous => ({ ...previous, isLoading: true }));
      return;
    }

    let isUnsubscribed = false;
    setResult(previous => ({ ...previous, isLoading: true, error: null }));

    const inputResolver = createDappInputResolver(
      allUtxos,
      resolvedTransactionInputs?.foreignResolvedInputs ?? [],
    );
    const assetProvider = createDappAssetProvider({
      tokensMetadata: tokensMetadataRef.current,
      tx: coreTx,
      dispatchLoadTokenMetadata,
      logger: dummyLogger,
    });

    const inspector = createTxInspector({
      tokenTransfer: tokenTransferInspector({
        inputResolver,
        fromAddressAssetProvider: assetProvider,
        toAddressAssetProvider: assetProvider,
        timeout: TIMEOUT,
        logger: dummyLogger,
      }),
      summary: transactionSummaryInspector({
        addresses: ownAddresses,
        rewardAccounts,
        inputResolver,
        protocolParameters: {
          poolDeposit: protocolParameters.poolDeposit,
          stakeKeyDeposit: protocolParameters.stakeKeyDeposit,
        },
        assetProvider,
        timeout: TIMEOUT,
        logger: dummyLogger,
      }),
    });

    void (async () => {
      try {
        const { tokenTransfer, summary } = await inspector(coreTx);
        if (isUnsubscribed) return;
        const { from, to } = computeNetFlows(
          tokenTransfer.fromAddress,
          tokenTransfer.toAddress,
          ownAddresses,
        );
        setResult({
          isLoading: false,
          error: null,
          fromAddresses: from,
          toAddresses: to,
          summary,
        });
      } catch (error) {
        if (isUnsubscribed) return;
        setResult({
          ...EMPTY,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to inspect transaction',
        });
      }
    })();

    return () => {
      isUnsubscribed = true;
    };
  }, [
    txHex,
    coreTx,
    allUtxos,
    resolvedTransactionInputs,
    dispatchLoadTokenMetadata,
    ownAddresses,
    rewardAccounts,
    protocolParameters,
  ]);

  return result;
};
