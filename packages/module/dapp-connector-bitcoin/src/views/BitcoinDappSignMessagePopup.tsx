import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignMessageContent, SignReviewLoadingContent } from '../components';
import { BITCOIN_DAPP_SIGN_MESSAGE_LOCATION } from '../const';
import {
  useDappPopupFlow,
  useDappViewClose,
  useSignMessageAccountInfo,
} from '../hooks';

export const BitcoinDappSignMessagePopup = () => {
  const { t } = useTranslation();
  const closeDappView = useDappViewClose(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);

  const { request, handleConfirm, handleReject } = useDappPopupFlow({
    type: 'signMessage',
    onReject: closeDappView,
  });

  const accountInfo = useSignMessageAccountInfo(request?.address ?? '');
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

  const isShowingLoading = !request;

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={{
        label: t('dapp-connector.bitcoin.sign-message.confirm'),
        action: handleConfirmAndTrack,
        disabled: isShowingLoading,
      }}
      secondaryButton={{
        label: t('dapp-connector.bitcoin.sign-message.cancel'),
        action: handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {t('dapp-connector.bitcoin.sign-message.title')}
        </Text.S>
      </View>
      <View style={styles.content}>
        {isShowingLoading ? (
          <SignReviewLoadingContent style={styles.centeredContent} />
        ) : (
          <SignMessageContent
            dapp={{
              icon: request.dapp.imageUrl
                ? {
                    img: { uri: request.dapp.imageUrl },
                    fallback: request.dapp.name,
                  }
                : { fallback: request.dapp.name },
              name: request.dapp.name,
              origin: request.dapp.origin,
            }}
            address={request.address}
            accountInfo={accountInfo}
            message={request.message}
            signatureType={request.signatureType}
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
