import { CreateWalletSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { useCreateNewWallet } from './useCreateNewWallet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { ButtonConfig } from '@lace-lib/ui-toolkit';

export const CreateNewWallet = (
  props: SheetScreenProps<SheetRoutes.CreateNewWallet>,
) => {
  const templateProps = useCreateNewWallet(props);
  const {
    title,
    cancelLabel,
    onCancel,
    confirmLabel,
    onConfirm,
    isLoading,
    isConfirmDisabled,
    cancelTestID,
    confirmTestID,
    ...bodyProps
  } = templateProps;

  const primaryButton = useMemo<ButtonConfig>(
    () => ({
      label: confirmLabel,
      onPress: onConfirm,
      disabled: isConfirmDisabled,
      loading: isLoading,
      testID: confirmTestID,
    }),
    [confirmLabel, onConfirm, isConfirmDisabled, isLoading, confirmTestID],
  );

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          showDivider={false}
          secondaryButton={{
            label: cancelLabel,
            onPress: onCancel,
            disabled: isLoading,
            testID: cancelTestID,
          }}
          primaryButton={primaryButton}
        />
      ),
    });
  }, [
    props.navigation,
    title,
    cancelLabel,
    onCancel,
    isLoading,
    cancelTestID,
    primaryButton,
  ]);

  return (
    <Sheet.SubmitProvider action={primaryButton}>
      <CreateWalletSheetTemplate {...bodyProps} />
    </Sheet.SubmitProvider>
  );
};

export default CreateNewWallet;
