import { CustomizeAccountSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { useCustomizeAccount } from './useCustomizeAccount';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { ButtonConfig } from '@lace-lib/ui-toolkit';

export const CustomizeAccount = (
  props: SheetScreenProps<SheetRoutes.CustomizeAccount>,
) => {
  const { actions, copies, utils } = useCustomizeAccount(props);

  const primaryButton = useMemo<ButtonConfig>(
    () => ({
      label: copies.primaryButtonLabel,
      onPress: actions.onSubmit,
      disabled: utils.isDisabled,
      testID: 'customize-account-confirm-button',
    }),
    [copies.primaryButtonLabel, actions.onSubmit, utils.isDisabled],
  );

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
          primaryButton={primaryButton}
        />
      ),
    });
  }, [
    props.navigation,
    actions.onCancel,
    copies.headerTitle,
    copies.secondaryButtonLabel,
    primaryButton,
  ]);

  return (
    <Sheet.SubmitProvider action={primaryButton}>
      <CustomizeAccountSheet actions={actions} copies={copies} utils={utils} />
    </Sheet.SubmitProvider>
  );
};
