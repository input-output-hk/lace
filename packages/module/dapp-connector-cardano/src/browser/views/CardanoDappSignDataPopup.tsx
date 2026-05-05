import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignDataContent, SignTxLoadingContent } from '../../common/components';
import { useSignDataAccountInfo } from '../../common/hooks/useSignDataAccountInfo';
import { CARDANO_DAPP_SIGN_DATA_LOCATION } from '../const';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

import type { SignDataContentProps } from '../../common/components/sign-data';

export const CardanoDappSignDataPopup = () => {
  const { t } = useTranslation();
  const closeDappView = useDappViewClose(CARDANO_DAPP_SIGN_DATA_LOCATION);

  const { request, handleConfirm, handleReject, isLoading } = useDappPopupFlow({
    type: 'signData',
    onReject: closeDappView,
  });

  const accountInfo = useSignDataAccountInfo();
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
  const scrollContent =
    isShowingLoading || !contentProps ? (
      <SignTxLoadingContent style={styles.centeredContent} />
    ) : (
      <SignDataContent {...contentProps} />
    );

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={{
        label: t('dapp-connector.cardano.sign-data.confirm'),
        action: handleConfirmWithHwIndicator,
        disabled: isShowingLoading || !contentProps,
      }}
      secondaryButton={{
        label: t('dapp-connector.cardano.sign-data.deny'),
        action: handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {t('dapp-connector.cardano.sign-data.title')}
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
