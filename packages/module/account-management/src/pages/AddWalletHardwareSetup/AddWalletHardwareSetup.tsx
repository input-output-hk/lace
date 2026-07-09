import { OnboardingHardwareWalletSetup, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddWalletHardwareSetup } from './useAddWalletHardwareSetup';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddWalletHardwareSetup = (
  props: SheetScreenProps<SheetRoutes.AddWalletHardwareSetup>,
) => {
  const {
    title,
    onBackPress,
    accountIndex,
    setAccountIndex,
    accountLabel,
    derivationTypeOptions,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeLabel,
    onCreateWallet,
    createButtonLabel,
    isCreating,
    error,
  } = useAddWalletHardwareSetup(props);

  const { navigation } = props;

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} leftIconOnPress={onBackPress} />,
      footer: (
        <Sheet.Footer
          showDivider={false}
          primaryButton={{
            label: createButtonLabel,
            onPress: onCreateWallet,
            loading: isCreating,
            disabled: isCreating,
            testID: 'hardware-setup-create-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    title,
    onBackPress,
    onCreateWallet,
    createButtonLabel,
    isCreating,
  ]);

  return (
    <OnboardingHardwareWalletSetup
      embedded
      title={title}
      onBackPress={onBackPress}
      accountIndex={accountIndex}
      onAccountIndexChange={setAccountIndex}
      accountLabel={accountLabel}
      derivationTypeOptions={derivationTypeOptions}
      derivationType={derivationType}
      onDerivationTypeChange={handleDerivationTypeChange}
      derivationTypeLabel={derivationTypeLabel}
      onCreateWallet={onCreateWallet}
      createButtonLabel={createButtonLabel}
      isLoading={isCreating}
      error={error}
    />
  );
};
