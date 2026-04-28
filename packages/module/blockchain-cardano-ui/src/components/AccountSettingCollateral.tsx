import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { SettingsCard } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

export interface AccountSettingCollateralProps {
  accountId: string;
  walletId: string;
}

export const AccountSettingCollateral = ({
  accountId,
  walletId,
}: AccountSettingCollateralProps) => {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.Collateral, {
      accountId,
      walletId,
    });
  }, [accountId, walletId]);

  return (
    <SettingsCard
      key={'blockchain-cardano-collateral'}
      testID={'account-settings-collateral'}
      title={t('account-details.settings.collateral.title')}
      description={t('account-details.settings.collateral.description')}
      isCritical={false}
      quickActions={{ onCardPress: handlePress }}
      iconName={'MoneySendFlow'}
    />
  );
};
