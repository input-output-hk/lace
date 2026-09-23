import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SignMessageContent,
  SignReviewErrorContent,
  SignReviewLoadingContent,
} from '../components';
import { BITCOIN_DAPP_SIGN_MESSAGE_LOCATION } from '../const';
import {
  useDappPopupFlow,
  useDappViewClose,
  useSignMessageAccountInfo,
} from '../hooks';

export const BitcoinDappSignMessagePopup = () => {
  const { t } = useTranslation();
  // Read at close time, so the close names the request the user answered even
  // once it has been cleared by an error or a success.
  const requestIdRef = useRef<string | undefined>(undefined);
  const closeDappView = useDappViewClose(
    BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
    requestIdRef,
  );

  const { request, handleConfirm, handleReject, isError } = useDappPopupFlow({
    type: 'signMessage',
    onReject: closeDappView,
  });

  if (request) requestIdRef.current = request.requestId;

  const accountInfo = useSignMessageAccountInfo(request?.address ?? '');
  const hasConfirmedRef = useRef(false);

  const handleConfirmAndTrack = useCallback(() => {
    hasConfirmedRef.current = true;
    handleConfirm();
  }, [handleConfirm]);

  // Success only: a failure clears the request too, so closing on `!request`
  // alone dismissed the error in the render it appeared.
  useEffect(() => {
    if (hasConfirmedRef.current && !request && !isError) {
      closeDappView();
    }
  }, [closeDappView, request, isError]);

  const isShowingLoading = !isError && !request;

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={
        isError
          ? undefined
          : {
              label: t('dapp-connector.bitcoin.sign-message.confirm'),
              action: handleConfirmAndTrack,
              disabled: isShowingLoading,
            }
      }
      secondaryButton={{
        // Once the request is settled there is nothing left to decline, and a
        // reject dispatched now would be consumed by whichever request has
        // taken this window over.
        label: isError
          ? t('dapp-connector.bitcoin.result.close')
          : t('dapp-connector.bitcoin.sign-message.cancel'),
        action: isError ? closeDappView : handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {isError
            ? t('dapp-connector.bitcoin.error-title')
            : t('dapp-connector.bitcoin.sign-message.title')}
        </Text.S>
      </View>
      <View style={styles.content}>
        {isError ? (
          <SignReviewErrorContent style={styles.centeredContent} />
        ) : isShowingLoading || !request ? (
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
