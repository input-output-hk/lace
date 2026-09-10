import { useTranslation } from '@lace-contract/i18n';
import { Sheet, useTheme } from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';

import {
  SignMessageContent,
  SignReviewLoadingContent,
  SignReviewResultContent,
  SignSheetScroll,
} from '../components';
import {
  useDappPopupFlow,
  useDispatchLaceAction,
  useSignMessageAccountInfo,
} from '../hooks';

import type { SignReviewResultState } from '../components';

/**
 * Side panel sheet for reviewing a dApp message signing request. Renders the
 * same review content as the popup, with the sheet's own header and footer
 * chrome so it composes with an already open side panel. After signing it
 * shows the result screen, closed by the user via its Close button.
 */
export const BitcoinDappSignMessageSheet = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const setActiveSheetPage = useDispatchLaceAction('views.setActiveSheetPage');
  const handleCloseResult = useCallback(() => {
    setActiveSheetPage(null);
  }, [setActiveSheetPage]);

  const { request, handleConfirm, handleReject, isComplete, isError } =
    useDappPopupFlow({
      type: 'signMessage',
    });

  const accountInfo = useSignMessageAccountInfo(request?.address ?? '');
  const isShowingLoading = !request;

  const resultState: SignReviewResultState | null = isComplete
    ? 'success'
    : isError
    ? 'failure'
    : null;
  const isShowingResult = resultState != null;

  useEffect(() => {
    if (isShowingResult) return;
    navigation.setOptions({
      header: (
        <Sheet.Header title={t('dapp-connector.bitcoin.sign-message.title')} />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('dapp-connector.bitcoin.sign-message.confirm'),
            onPress: handleConfirm,
            iconColor: theme.brand.white,
            disabled: isShowingLoading,
          }}
          secondaryButton={{
            label: t('dapp-connector.bitcoin.sign-message.cancel'),
            onPress: handleReject,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    navigation,
    t,
    theme.brand.white,
    handleConfirm,
    handleReject,
    isShowingLoading,
    isShowingResult,
  ]);

  if (resultState) {
    return (
      <SignReviewResultContent
        state={resultState}
        descriptionKey={
          resultState === 'success'
            ? 'dapp-connector.bitcoin.sign-message.result.success.description'
            : 'dapp-connector.bitcoin.sign-message.result.failure.description'
        }
        onClose={handleCloseResult}
        testID="bitcoin-sign-message-result"
      />
    );
  }

  return (
    <SignSheetScroll testID="bitcoin-sign-message-sheet-scroll">
      {isShowingLoading ? (
        <SignReviewLoadingContent />
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
    </SignSheetScroll>
  );
};
