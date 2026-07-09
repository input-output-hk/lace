import { AccountId } from '@lace-contract/wallet-repo';
import {
  AccountSecurityAlertInline,
  ReviewTransactionTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useReviewTransaction } from './useReviewTransaction';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ReviewTransaction = (
  props: SheetScreenProps<SheetRoutes.ReviewTransaction>,
) => {
  const {
    labels,
    values,
    backButtonPress,
    nextButtonPress,
    isNextButtonDisabled,
  } = useReviewTransaction(props);
  const { accountId } = props.route.params;

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={labels.headerTitle}
          leftIconOnPress={backButtonPress}
          testID="review-transaction-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: labels.nextButtonLabel,
            onPress: nextButtonPress,
            disabled: isNextButtonDisabled,
            testID: 'review-transaction-sheet-next-button',
          }}
        />
      ),
    });
  }, [
    props.navigation,
    labels.headerTitle,
    labels.nextButtonLabel,
    backButtonPress,
    nextButtonPress,
    isNextButtonDisabled,
  ]);

  return (
    <ReviewTransactionTemplate
      labels={labels}
      values={values}
      belowAccountSlot={
        accountId ? (
          <AccountSecurityAlertInline accountId={AccountId(accountId)} />
        ) : undefined
      }
    />
  );
};
