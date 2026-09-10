import {
  AccountSecurityAlertInline,
  SendSheet as SendSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { useSendSheet } from './useSendSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { ButtonConfig } from '@lace-lib/ui-toolkit';

export const SendSheet = (props: SheetScreenProps<SheetRoutes.Send>) => {
  const { sendSheetProps } = useSendSheet(props);
  const { actions, copies, sheetFooterTitleRow, utils, values } =
    sendSheetProps;

  const primaryButton = useMemo<ButtonConfig>(
    () => ({
      label: copies.reviewTransactionLabel,
      onPress: actions.onReviewTransactionPress,
      disabled: !utils.isReviewTransactionEnabled,
      testID: 'send-form-review-transaction-button',
    }),
    [
      copies.reviewTransactionLabel,
      actions.onReviewTransactionPress,
      utils.isReviewTransactionEnabled,
    ],
  );

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header title={copies.headerTitle} testID="send-form-header" />
      ),
      footer: (
        <Sheet.Footer
          titleRow={sheetFooterTitleRow}
          primaryButton={primaryButton}
        />
      ),
    });
  }, [
    props.navigation,
    copies.headerTitle,
    sheetFooterTitleRow,
    primaryButton,
  ]);

  return (
    <Sheet.SubmitProvider action={primaryButton}>
      <SendSheetTemplate
        {...sendSheetProps}
        belowAccountSlot={
          values.selectedAccountId ? (
            <AccountSecurityAlertInline accountId={values.selectedAccountId} />
          ) : undefined
        }
      />
    </Sheet.SubmitProvider>
  );
};
