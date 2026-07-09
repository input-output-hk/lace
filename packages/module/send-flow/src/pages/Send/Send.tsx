import {
  AccountSecurityAlertInline,
  SendSheet as SendSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useSendSheet } from './useSendSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SendSheet = (props: SheetScreenProps<SheetRoutes.Send>) => {
  const { sendSheetProps } = useSendSheet(props);
  const { actions, copies, sheetFooterTitleRow, utils, values } =
    sendSheetProps;

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header title={copies.headerTitle} testID="send-form-header" />
      ),
      footer: (
        <Sheet.Footer
          titleRow={sheetFooterTitleRow}
          primaryButton={{
            label: copies.reviewTransactionLabel,
            onPress: actions.onReviewTransactionPress,
            disabled: !utils.isReviewTransactionEnabled,
            testID: 'send-form-review-transaction-button',
          }}
        />
      ),
    });
  }, [props.navigation, actions, copies, sheetFooterTitleRow, utils]);

  return (
    <SendSheetTemplate
      {...sendSheetProps}
      belowAccountSlot={
        values.selectedAccountId ? (
          <AccountSecurityAlertInline accountId={values.selectedAccountId} />
        ) : undefined
      }
    />
  );
};
