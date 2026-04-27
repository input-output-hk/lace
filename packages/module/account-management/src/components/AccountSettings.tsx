import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  SettingsCard,
  spacing,
  type IconName,
} from '@lace-lib/ui-toolkit';
import noop from 'lodash/noop';
import React, { useCallback, useMemo } from 'react';

import type { AccountSettingsOption } from '@lace-contract/account-management';
import type { AnyAccount } from '@lace-contract/wallet-repo';

type ExtendedAccountSettingsOption = {
  title: string;
  description: string;
  onPress: () => void;
  variant: 'danger' | 'primary' | 'secondary';
  isCritical?: boolean;
  iconName?: IconName;
};

export const AccountSettings = ({ account }: { account: AnyAccount }) => {
  const { t } = useTranslation();

  const accountSettingsUICustomisations = useUICustomisation(
    'addons.loadAccountSettingsUICustomisations',
    { blockchainName: account?.blockchainName },
  );

  const handleOpenSheet = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.CustomizeAccount, {
      walletId: account.walletId,
      accountId: account.accountId,
    });
  }, [account.walletId, account.accountId]);

  const handleNavigateToYourKeys = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.AccountKey, {
      walletId: account.walletId,
      accountId: account.accountId,
    });
  }, [account.walletId, account.accountId]);

  const buildCustomizeAccountSetting = useCallback(
    (): ExtendedAccountSettingsOption => ({
      title: t('account-details.settings.customize-account.title'),
      description: t('account-details.settings.customize-account.description'),
      iconName: 'PencilEdit' as IconName,
      onPress: handleOpenSheet,
      variant: 'secondary' as const,
      isCritical: false,
    }),
    [t, handleOpenSheet],
  );

  const buildYourKeysSetting = useCallback(
    (): ExtendedAccountSettingsOption => ({
      title: t('account-details.settings.your-keys.title'),
      description: t('account-details.settings.your-keys.description'),
      iconName: 'PasswordValidation' as IconName,
      onPress: handleNavigateToYourKeys,
      variant: 'secondary' as const,
      isCritical: false,
    }),
    [t, handleNavigateToYourKeys],
  );

  const buildExtendedSetting = useCallback(
    (settingId: string): ExtendedAccountSettingsOption => {
      const settingMap: Record<string, () => ExtendedAccountSettingsOption> = {
        'customize-account': buildCustomizeAccountSetting,
        'your-keys': buildYourKeysSetting,
      };

      return (
        settingMap[settingId]?.() ?? {
          title: 'Unknown Setting',
          description: 'Unknown Setting Description',
          iconName: 'QuestionMark' as IconName,
          onPress: noop,
          variant: 'secondary' as const,
          isCritical: false,
        }
      );
    },
    [buildCustomizeAccountSetting, buildYourKeysSetting, t],
  );

  const relevantSettings = useMemo(() => {
    const customizationSettings = accountSettingsUICustomisations.flatMap(
      customization =>
        customization.getAccountSettingsOptions({
          accountId: account.accountId,
          walletId: account.walletId,
        }),
    );

    return customizationSettings.map(setting => ({
      ...setting,
      ...buildExtendedSetting(setting.id),
    }));
  }, [
    accountSettingsUICustomisations,
    account?.accountId,
    account?.walletId,
    buildExtendedSetting,
  ]);

  const getSettingComponent = useCallback(
    (setting: AccountSettingsOption & ExtendedAccountSettingsOption) => {
      if (setting.component) {
        return (
          <setting.component
            key={setting.id}
            accountId={String(account.accountId)}
            walletId={String(account.walletId)}
          />
        );
      }
      return (
        <SettingsCard
          key={setting.id}
          {...setting}
          testID={`account-settings-${setting.id}`}
          quickActions={{
            onCardPress: setting.onPress,
          }}
        />
      );
    },
    [account.accountId, account.walletId],
  );

  return (
    <Column alignItems="center" gap={spacing.S}>
      {relevantSettings?.map(setting => getSettingComponent(setting))}
    </Column>
  );
};
