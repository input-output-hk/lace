import React from 'react';
import { ContentLayout } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { SettingsWallet, SettingsSecurity, SettingsHelp, SettingsLegal, SettingsPreferences } from '..';
import { SettingsRemoveWallet } from '@src/views/browser-view/features/settings/components/SettingsRemoveWallet';

export interface SettingsProps {
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: Array<string>;
}

export const Settings = ({ defaultPassphraseVisible, defaultMnemonic }: SettingsProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <ContentLayout title={t('settings.title')} data-testid="settings-page-title">
      <div>
        <SettingsWallet popupView />
        {process.env.USE_MULTI_CURRENCY === 'true' && <SettingsPreferences popupView />}
        <SettingsSecurity
          popupView
          defaultPassphraseVisible={defaultPassphraseVisible}
          defaultMnemonic={defaultMnemonic}
        />
        <SettingsHelp popupView />
        <SettingsLegal />
        <SettingsRemoveWallet popupView />
      </div>
    </ContentLayout>
  );
};
