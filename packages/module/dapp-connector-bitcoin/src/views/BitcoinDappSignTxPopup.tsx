import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SignPsbtContent,
  SignReviewErrorContent,
  SignReviewLoadingContent,
} from '../components';
import { BITCOIN_DAPP_SIGN_TX_LOCATION } from '../const';
import {
  useDappPopupFlow,
  useDappViewClose,
  useDispatchLaceAction,
  useSignPsbtData,
} from '../hooks';

export const BitcoinDappSignTxPopup = () => {
  const { t } = useTranslation();
  const closeDappView = useDappViewClose(BITCOIN_DAPP_SIGN_TX_LOCATION);

  const { request, handleConfirm, handleReject } = useDappPopupFlow({
    type: 'signPsbt',
    onReject: closeDappView,
  });

  const setPsbtPagerIndex = useDispatchLaceAction(
    'bitcoinDappConnector.setPsbtPagerIndex',
  );
  const psbtData = useSignPsbtData(request);
  const hasConfirmedRef = useRef(false);

  const handleConfirmAndTrack = useCallback(() => {
    hasConfirmedRef.current = true;
    handleConfirm();
  }, [handleConfirm]);

  useEffect(() => {
    if (hasConfirmedRef.current && !request) {
      closeDappView();
    }
  }, [closeDappView, request]);

  const hasError = Boolean(request) && psbtData.hasError;
  const isShowingLoading =
    !hasError &&
    (!request || psbtData.isResolvingInputs || !psbtData.inspection);

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={
        hasError
          ? undefined
          : {
              label: t('dapp-connector.bitcoin.sign-psbt.confirm'),
              action: handleConfirmAndTrack,
              disabled: isShowingLoading,
            }
      }
      secondaryButton={{
        label: t('dapp-connector.bitcoin.sign-psbt.cancel'),
        action: handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {hasError
            ? t('dapp-connector.bitcoin.error-title')
            : t('dapp-connector.bitcoin.sign-psbt.title')}
        </Text.S>
      </View>
      <View style={styles.content}>
        {hasError ? (
          <SignReviewErrorContent style={styles.centeredContent} />
        ) : isShowingLoading || !request || !psbtData.inspection ? (
          <SignReviewLoadingContent style={styles.centeredContent} />
        ) : (
          <SignPsbtContent
            dapp={{ name: request.dapp.name, origin: request.dapp.origin }}
            inspection={psbtData.inspection}
            rawPsbtBase64={psbtData.currentPsbtBase64}
            currentIndex={request.currentIndex}
            totalCount={request.psbtsBase64.length}
            onPagerChange={setPsbtPagerIndex}
            accountId={request.accountId}
          />
        )}
      </View>
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
