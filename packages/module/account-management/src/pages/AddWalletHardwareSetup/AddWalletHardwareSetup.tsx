import { OnboardingHardwareWalletSetup } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAddWalletHardwareSetup } from './useAddWalletHardwareSetup';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const SHEET_HEIGHT_RATIO = 0.9;

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
  const { height: windowHeight } = useWindowDimensions();

  const containerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  return (
    <View style={containerStyle}>
      <OnboardingHardwareWalletSetup
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
