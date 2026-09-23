import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SignDataContent,
  SignDataError,
  SignTxLoadingContent,
} from '../../common/components';
import { useSignDataAccountInfo } from '../../common/hooks/useSignDataAccountInfo';
import { CARDANO_DAPP_SIGN_DATA_LOCATION } from '../const';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

import type { SignDataContentProps } from '../../common/components/sign-data';

export const CardanoDappSignDataPopup = () => {
  const { t } = useTranslation();
  // Read at close time, so the close names the request the user answered even
  // once it has been cleared by an error or a success.
  const requestIdRef = useRef<string | undefined>(undefined);
  const closeDappView = useDappViewClose(
    CARDANO_DAPP_SIGN_DATA_LOCATION,
    requestIdRef,
  );

  const { request, handleConfirm, handleReject, isLoading, isError } =
    useDappPopupFlow({
      type: 'signData',
      onReject: closeDappView,
    });

  const accountInfo = useSignDataAccountInfo(request?.dappOrigin);
  const hasConfirmedRef = useRef(false);

  // A queued request inherits this window without a remount, so a flag meaning
  // "this view confirmed what it is showing" must not outlive the id it refers
  // to — the auto-close below is only otherwise blocked by its hasError gate.
  if (request && requestIdRef.current !== request.requestId) {
    requestIdRef.current = request.requestId;
    hasConfirmedRef.current = false;
  }

  const handleConfirmWithHwIndicator = useCallback(() => {
    hasConfirmedRef.current = true;
    handleConfirm();
  }, [handleConfirm]);

  // Auto-close on success only. The request is cleared for BOTH a completed
  // sign and a failed one, so closing on `!request` alone dismissed the error
  // state in the same render it appeared — the user was never told the signing
  // failed. Errors stay on screen until the user closes them.
  useEffect(() => {
    if (hasConfirmedRef.current && !request && !isError) {
      closeDappView();
    }
  }, [closeDappView, request, isError]);

  const contentProps = useMemo((): SignDataContentProps | null => {
    if (request === null) {
      return null;
    }
    const { dapp, address, payload } = request;
    return {
      dapp: {
        icon: dapp.imageUrl
          ? {
              img: { uri: dapp.imageUrl },
              fallback: dapp.name,
            }
          : { fallback: dapp.name },
        name: dapp.name,
        origin: dapp.origin,
      },
      accountInfo,
      address,
      payload,
    };
  }, [request, accountInfo]);

  const isShowingLoading = isLoading;
  const scrollContent = useMemo(() => {
    if (isError) return <SignDataError style={styles.centeredContent} />;
    if (isShowingLoading || !contentProps) {
      return <SignTxLoadingContent style={styles.centeredContent} />;
    }
    return <SignDataContent {...contentProps} />;
  }, [contentProps, isError, isShowingLoading]);

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={
        isError
          ? undefined
          : {
              label: t('dapp-connector.cardano.sign-data.confirm'),
              action: handleConfirmWithHwIndicator,
              disabled: isShowingLoading || !contentProps,
            }
      }
      secondaryButton={{
        // Once the request is settled there is nothing left to decline, and a
        // reject dispatched now would be consumed by whichever request has
        // taken this window over.
        label: isError
          ? t('dapp-connector.cardano.sign-data.result.close')
          : t('dapp-connector.cardano.sign-data.deny'),
        action: isError ? closeDappView : handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {isError
            ? t('dapp-connector.cardano.sign-data.error-title')
            : t('dapp-connector.cardano.sign-data.title')}
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
