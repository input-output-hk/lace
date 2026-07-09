import { CustomizeAccountSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useCustomizeAccount } from './useCustomizeAccount';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const CustomizeAccount = (
  props: SheetScreenProps<SheetRoutes.CustomizeAccount>,
) => {
  const { actions, copies, utils } = useCustomizeAccount(props);

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={copies.headerTitle} />,
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: copies.secondaryButtonLabel,
            onPress: actions.onCancel,
            testID: 'customize-account-cancel-button',
          }}
          primaryButton={{
            label: copies.primaryButtonLabel,
            onPress: actions.onSubmit,
            disabled: utils.isDisabled,
            testID: 'customize-account-confirm-button',
          }}
        />
      ),
    });
  }, [props.navigation, actions, copies, utils.isDisabled]);

  return (
    <CustomizeAccountSheet actions={actions} copies={copies} utils={utils} />
  );
};
