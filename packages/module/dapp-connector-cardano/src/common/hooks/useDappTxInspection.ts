import {
  Cardano,
  Milliseconds,
  Serialization,
  createTxInspector,
  tokenTransferInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import {
  computeNetFlows,
  type TokenTransferValue,
} from '@lace-contract/cardano-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dummyLogger } from 'ts-log';

import { createDappAssetProvider } from '../utils/create-dapp-asset-provider';
import { createDappInputResolver } from '../utils/create-dapp-input-resolver';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';

import type { TransactionSummaryInspection } from '@cardano-sdk/core';

const TIMEOUT = Milliseconds(6000);

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
