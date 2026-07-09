import { CreateWalletSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useCreateNewWallet } from './useCreateNewWallet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

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
          primaryButton={{
            label: confirmLabel,
            onPress: onConfirm,
            disabled: isConfirmDisabled,
            loading: isLoading,
            testID: confirmTestID,
          }}
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
    confirmLabel,
    onConfirm,
    isConfirmDisabled,
    confirmTestID,
  ]);

  return <CreateWalletSheetTemplate {...bodyProps} />;
};

export default CreateNewWallet;
