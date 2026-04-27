import React from 'react';
import { StyleSheet } from 'react-native';

import { SignTxLayout, SignTxResult } from '../../../common/components';

import { useSignTx } from './useSignTx';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export type { SignTxContentProps } from '../../../common/components';
export { SignTxContent } from '../../../common/components';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
  },
});

export const SignTx = (props: SheetScreenProps<SheetRoutes.SignTx>) => {
  const {
    isLoading,
    transactionError,
    isSigning,
    signTxResult,
    handleCloseResult,
    ...contentProps
  } = useSignTx(props);

  const resultView = signTxResult ? (
    <SignTxResult
      state={signTxResult.state}
      onClose={handleCloseResult}
      dappName={contentProps.dapp?.name}
      dappOrigin={contentProps.dapp?.origin}
    />
  ) : null;

  const hasError = !!transactionError;
  const isShowingLoading = isLoading || !contentProps.transactionInfo;
  const layoutContentProps = contentProps.transactionInfo
    ? {
        dapp: contentProps.dapp,
        txHex: contentProps.txHex,
        transactionInfo: contentProps.transactionInfo,
        fromAddresses: contentProps.fromAddresses,
        toAddresses: contentProps.toAddresses,
        ownAddresses: contentProps.ownAddresses,
        addressToNameMap: contentProps.addressToNameMap,
        tokensMetadata: contentProps.tokensMetadata,
        collateralValue: contentProps.collateralValue,
        expiresBy: contentProps.expiresBy,
        coinSymbol: contentProps.coinSymbol,
        tokenPrices: contentProps.tokenPrices,
        currencyTicker: contentProps.currencyTicker,
        networkMagic: contentProps.networkMagic,
        isPartialSign: contentProps.isPartialSign,
      }
    : null;

  return (
    <SignTxLayout
      resultView={resultView}
      hasError={hasError}
      showLoading={isShowingLoading}
      contentProps={layoutContentProps}
      onConfirm={contentProps.handleConfirm}
      onReject={contentProps.handleReject}
      confirmDisabled={
        isLoading ||
        isSigning ||
        contentProps.isResolvingInputs ||
        contentProps.isLoadingCollateral
      }
      loadingStyle={styles.loadingContainer}
      errorStyle={styles.centeredContent}
    />
  );
};
