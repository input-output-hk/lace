import { SendResultTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useSendResult } from './useSendResult';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SendResult = (props: SheetScreenProps<SheetRoutes.SendResult>) => {
  const {
    headerTitle,
    icon,
    subtitle,
    errorDetails,
    footer,
    result,
    transactionDetails,
    transactionDetailsLabels,
    shouldHidePrimaryButtonOnSuccess,
  } = useSendResult(props);
  const isSuccess = result.status === 'success';
  const isFailure = result.status === 'failure';
  const shouldShowSecondaryButton = !!footer?.closeButton;
  const shouldShowPrimaryButton =
    (isSuccess && !shouldHidePrimaryButtonOnSuccess) || isFailure;
  const shouldShowFooter = shouldShowPrimaryButton || shouldShowSecondaryButton;

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header title={headerTitle} testID="send-result-sheet-header" />
      ),
      footer: shouldShowFooter ? (
        <Sheet.Footer
          secondaryButton={
            shouldShowSecondaryButton && footer?.closeButton
              ? {
                  label: footer.closeButton.closeButtonLabel,
                  onPress: footer.closeButton.closeButtonPress,
                  testID: 'send-result-close-button',
                }
              : undefined
          }
          primaryButton={
            shouldShowPrimaryButton && footer?.primaryButton
              ? {
                  label: footer.primaryButton.primaryButtonLabel,
                  onPress: footer.primaryButton.primaryButtonPress,
                  testID: 'send-result-primary-button',
                }
              : undefined
          }
        />
      ) : undefined,
    });
  }, [
    props.navigation,
    headerTitle,
    shouldShowFooter,
    shouldShowSecondaryButton,
    shouldShowPrimaryButton,
    footer,
  ]);

  return (
    <SendResultTemplate
      transactionState={result}
      subtitle={subtitle}
      icon={icon}
      transactionDetails={transactionDetails}
      labels={transactionDetailsLabels}
      errorDetails={errorDetails}
    />
  );
};
