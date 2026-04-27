import { WalletType } from '@lace-contract/wallet-repo';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { SignTxLayout, SignTxResult } from '../../common/components';
import { useLaceSelector } from '../../common/hooks';
import {
  useSignTxData,
  type UseSignTxDataResult,
} from '../../common/hooks/useSignTxData';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

/**
 * Extension popup view for dApp transaction signing.
 * Uses the same common SignTx UI (SignTxView, SignTxContent, SignTxResult) as mobile.
 * Flow (confirm/reject, success close) is browser-specific; shared tx data comes from useSignTxData.
 */
export const CardanoDappSignTx = () => {
  const closeDappView = useDappViewClose();

  const {
    request,
    handleConfirm,
    handleReject,
    isLoading,
    isComplete,
    isError,
  } = useDappPopupFlow({
    type: 'signTx',
    onReject: closeDappView,
  });

  const signTxData: UseSignTxDataResult = useSignTxData({
    txHex: request?.txHex ?? '',
  });

  /**
   * Persist dapp info across request being cleared: when the success screen
   * shows, the request may already be gone, but we still need name/origin.
   */
  const [persistedDapp, setPersistedDapp] = useState<
    { name?: string; origin: string } | undefined
  >(() =>
    request
      ? { name: request.dapp.name, origin: request.dapp.origin }
      : undefined,
  );
  useEffect(() => {
    if (request) {
      setPersistedDapp({
        name: request.dapp.name,
        origin: request.dapp.origin,
      });
    }
  }, [request]);

  const hwErrorKeys = useLaceSelector(
    'cardanoDappConnector.selectSignTxHwErrorKeys',
  );

  const sessionAccountByOrigin = useLaceSelector(
    'cardanoDappConnector.selectSessionAccountByOrigin',
  );
  const allWallets = useLaceSelector('wallets.selectAll');
  const isHardwareWalletSession = (() => {
    if (!request) return false;
    const accountId = sessionAccountByOrigin[request.dappOrigin];
    if (!accountId) return false;
    const wallet = allWallets.find(w =>
      w.accounts.some(a => a.accountId === accountId),
    );
    return (
      wallet?.type === WalletType.HardwareLedger ||
      wallet?.type === WalletType.HardwareTrezor
    );
  })();

  const [isHwSigning, setIsHwSigning] = useState(false);
  useEffect(() => {
    if (isComplete || isError) setIsHwSigning(false);
  }, [isComplete, isError]);

  const handleConfirmWithHwIndicator = useCallback(() => {
    if (isHardwareWalletSession) setIsHwSigning(true);
    handleConfirm();
  }, [handleConfirm, isHardwareWalletSession]);

  const resultState = isComplete
    ? 'success'
    : isError
    ? 'failure'
    : isHwSigning
    ? 'signing'
    : null;
  const resultView = resultState ? (
    <SignTxResult
      state={resultState}
      onClose={closeDappView}
      dappName={persistedDapp?.name}
      dappOrigin={persistedDapp?.origin}
      titleKey={resultState === 'failure' ? hwErrorKeys?.title : undefined}
      descriptionKey={
        resultState === 'failure' ? hwErrorKeys?.subtitle : undefined
      }
    />
  ) : null;

  const hasError = Boolean(request && signTxData.transactionError);
  const isShowingLoading = !isComplete && !isError && (isLoading || !request);

  const contentProps =
    request && signTxData.transactionInfo
      ? {
          dapp: { name: request.dapp.name, origin: request.dapp.origin },
          txHex: request.txHex,
          transactionInfo: signTxData.transactionInfo,
          fromAddresses: signTxData.fromAddresses,
          toAddresses: signTxData.toAddresses,
          ownAddresses: signTxData.ownAddresses,
          addressToNameMap: signTxData.addressToNameMap,
          tokensMetadata: signTxData.tokensMetadata,
          collateralValue: signTxData.collateralValue,
          expiresBy: signTxData.expiresBy,
          coinSymbol: signTxData.coinSymbol,
          tokenPrices: signTxData.tokenPrices,
          currencyTicker: signTxData.currencyTicker,
          networkMagic: signTxData.networkMagic,
          isPartialSign: request.partialSign,
        }
      : null;

  return (
    <SignTxLayout
      resultView={resultView}
      hasError={hasError}
      showLoading={isShowingLoading}
      contentProps={contentProps}
      onConfirm={handleConfirmWithHwIndicator}
      onReject={handleReject}
      confirmDisabled={
        signTxData.isResolvingInputs || signTxData.isLoadingCollateral
      }
      loadingStyle={styles.loadingContainer}
      errorStyle={styles.centeredContent}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
  },
});
