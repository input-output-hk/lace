import { useTranslation } from '@lace-contract/i18n';
import { Sheet, useTheme } from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';

import {
  SignPsbtContent,
  SignReviewErrorContent,
  SignReviewLoadingContent,
  SignReviewResultContent,
  SignSheetScroll,
} from '../components';
import {
  useDappPopupFlow,
  useDispatchLaceAction,
  useSignPsbtData,
} from '../hooks';

import type { SignReviewResultState } from '../components';

/**
 * Side panel sheet for reviewing a dApp PSBT signing request. Renders the same
 * review content as the popup, with the sheet's own header and footer chrome so
 * it composes with an already open side panel. After signing it shows the
 * result screen, closed by the user via its Close button.
 */
export const BitcoinDappSignTxSheet = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const setActiveSheetPage = useDispatchLaceAction('views.setActiveSheetPage');
  const handleCloseResult = useCallback(() => {
    setActiveSheetPage(null);
  }, [setActiveSheetPage]);

  const { request, handleConfirm, handleReject, isComplete, isError } =
    useDappPopupFlow({
      type: 'signPsbt',
    });

  const setPsbtPagerIndex = useDispatchLaceAction(
    'bitcoinDappConnector.setPsbtPagerIndex',
  );
  const psbtData = useSignPsbtData(request);

  const hasError = Boolean(request) && psbtData.hasError;
  const isShowingLoading =
    !hasError &&
    (!request || psbtData.isResolvingInputs || !psbtData.inspection);

  const resultState: SignReviewResultState | null = isComplete
    ? 'success'
    : isError
    ? 'failure'
    : null;
  const isShowingResult = resultState != null;

  const title = hasError
    ? t('dapp-connector.bitcoin.error-title')
    : t('dapp-connector.bitcoin.sign-psbt.title');

  useEffect(() => {
    if (isShowingResult) return;
    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          primaryButton={
            hasError
              ? undefined
              : {
                  label: t('dapp-connector.bitcoin.sign-psbt.confirm'),
                  onPress: handleConfirm,
                  iconColor: theme.brand.white,
                  disabled: isShowingLoading,
                }
          }
          secondaryButton={{
            label: t('dapp-connector.bitcoin.sign-psbt.cancel'),
            onPress: handleReject,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    navigation,
    t,
    title,
    theme.brand.white,
    handleConfirm,
    handleReject,
    hasError,
    isShowingLoading,
    isShowingResult,
  ]);

  if (resultState) {
    return (
      <SignReviewResultContent
        state={resultState}
        descriptionKey={
          resultState === 'success'
            ? 'dapp-connector.bitcoin.sign-psbt.result.success.description'
            : 'dapp-connector.bitcoin.sign-psbt.result.failure.description'
        }
        onClose={handleCloseResult}
        testID="bitcoin-sign-psbt-result"
      />
    );
  }

  return (
    <SignSheetScroll testID="bitcoin-sign-psbt-sheet-scroll">
      {hasError ? (
        <SignReviewErrorContent />
      ) : isShowingLoading || !request || !psbtData.inspection ? (
        <SignReviewLoadingContent />
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
    </SignSheetScroll>
  );
};
