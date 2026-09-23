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
import { SignTxRefused } from '../../common/components/SignTxRefused';
import {
  signTxCopy,
  useSignTxRefusal,
} from '../../common/components/useSignTxRefusal';
import {
  useSignTxData,
  type UseSignTxDataResult,
} from '../../common/hooks/useSignTxData';
import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../const';
import { useDappPopupFlow, useDappViewClose } from '../hooks';

export const CardanoDappSignTxPopup = () => {
  const { t } = useTranslation();
  // Read at close time, so the close names the request the user answered even
  // once it has been cleared by an error or a success.
  const requestIdRef = useRef<string | undefined>(undefined);
  const closeDappView = useDappViewClose(
    CARDANO_DAPP_SIGN_TX_LOCATION,
    requestIdRef,
  );

  const { request, handleConfirm, handleReject, isLoading, isError } =
    useDappPopupFlow({
      type: 'signTx',
      onReject: closeDappView,
    });

  // The verdict reaches this view through the pending-request slice only.
  const refusal = useSignTxRefusal({
    collateralRefusal: request?.collateralRefusal,
    dappOrigin: request?.dapp.origin,
  });

  const signTxData: UseSignTxDataResult = useSignTxData({
    // Shape A: a refused request renders no transaction-derived value, so it
    // is not inspected, resolved or priced either -- the CBOR is hostile.
    txHex: refusal ? '' : request?.txHex ?? '',
    dappOrigin: request?.dappOrigin,
  });
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

  // Include isError: a port drop or a post-consent signing failure clears the
  // request, so the transactionError branch alone would miss it.
  const hasError = isError || Boolean(request && signTxData.transactionError);

  // Auto-close on success only. The request is cleared for BOTH a completed
  // sign and a failed one, so closing on `!request` alone dismissed the error
  // state in the same render it appeared — the user was never told the signing
  // failed. Errors stay on screen until the user closes them.
  useEffect(() => {
    if (hasConfirmedRef.current && !request && !hasError) {
      closeDappView();
    }
  }, [closeDappView, request, hasError]);
  const { titleKey, dismissLabelKey, shouldSuppressPrimary } = signTxCopy(
    refusal,
    hasError,
  );
  const isShowingLoading = refusal === null && (isLoading || !request);

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
          accountId: signTxData.accountId,
        }
      : null;

  const scrollContent = useMemo(() => {
    // Refused takes precedence over the generic error state: a blocked
    // transaction is refused, not broken -- they are distinct states.
    if (refusal) {
      return <SignTxRefused refusal={refusal} style={styles.centeredContent} />;
    }
    if (hasError) return <SignTxError style={styles.centeredContent} />;
    if (isShowingLoading || !contentProps) {
      return <SignTxLoadingContent style={styles.centeredContent} />;
    }
    return <SignTxContent {...contentProps} />;
  }, [refusal, contentProps, hasError, isShowingLoading]);

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={
        shouldSuppressPrimary
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
        // Once the request is settled there is nothing left to decline, and a
        // reject dispatched now would be consumed by whichever request has
        // taken this window over. A refused request is not settled: its
        // dismissal is the reject the refused flow waits for.
        label: t(
          hasError && !refusal
            ? 'dapp-connector.cardano.sign-tx.result.close'
            : dismissLabelKey,
        ),
        action: hasError && !refusal ? closeDappView : handleReject,
      }}>
      <View style={styles.header}>
        <Text.S align="center">{t(titleKey)}</Text.S>
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
