import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SignTxContent,
  SignTxError,
  SignTxLoadingContent,
} from '../../common/components';
import {
  useSignTxData,
  type UseSignTxDataResult,
} from '../../common/hooks/useSignTxData';
import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../const';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

export const CardanoDappSignTxPopup = () => {
  const { t } = useTranslation();
  const closeDappView = useDappViewClose(CARDANO_DAPP_SIGN_TX_LOCATION);

  const { request, handleConfirm, handleReject, isLoading } = useDappPopupFlow({
    type: 'signTx',
    onReject: closeDappView,
  });

  const signTxData: UseSignTxDataResult = useSignTxData({
    txHex: request?.txHex ?? '',
  });
  const hasConfirmedRef = useRef(false);

  const handleConfirmWithHwIndicator = useCallback(() => {
    hasConfirmedRef.current = true;
    handleConfirm();
  }, [handleConfirm]);

  useEffect(() => {
    if (hasConfirmedRef.current && !request) {
      closeDappView();
    }
  }, [closeDappView, request]);

  const hasError = Boolean(request && signTxData.transactionError);
  const isShowingLoading = isLoading || !request;

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

  const scrollContent = useMemo(() => {
    if (hasError) return <SignTxError style={styles.centeredContent} />;
    if (isShowingLoading || !contentProps) {
      return <SignTxLoadingContent style={styles.centeredContent} />;
    }
    return <SignTxContent {...contentProps} />;
  }, [contentProps, hasError, isShowingLoading]);

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={
        hasError
          ? undefined
          : {
              label: t('dapp-connector.cardano.sign-tx.confirm'),
              action: handleConfirmWithHwIndicator,
              disabled:
                signTxData.isResolvingInputs ||
                signTxData.isLoadingCollateral ||
                isShowingLoading ||
                !contentProps,
            }
      }
      secondaryButton={{
        label: t('dapp-connector.cardano.sign-tx.cancel'),
        action: handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {hasError
            ? t('dapp-connector.cardano.sign-tx.error-title')
            : t('dapp-connector.cardano.sign-tx.title')}
        </Text.S>
      </View>
      <View style={styles.content}>{scrollContent}</View>
    </DappConnectorLayoutV2>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.M,
  },
  content: {
    paddingHorizontal: spacing.S,
  },
  centeredContent: {
    minHeight: 360,
  },
});
