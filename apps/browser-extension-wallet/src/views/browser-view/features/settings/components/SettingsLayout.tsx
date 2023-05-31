import React from 'react';
import { SettingsWallet, SettingsSecurity, SettingsLegal, SettingsAbout, SettingsHelp, SettingsPreferences } from './';
import { PageTitle } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { Layout, SectionLayout } from '@src/views/browser-view/components/Layout';
import { SettingsRemoveWallet } from './SettingsRemoveWallet';

export interface SettingsLayoutProps {
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: Array<string>;
}

export const SettingsLayout = ({
  defaultPassphraseVisible,
  defaultMnemonic
}: SettingsLayoutProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Layout>
      <SectionLayout sidePanelContent={<SettingsAbout data-testid="about-container" />}>
        <PageTitle data-testid="settings-page-title">{t('browserView.settings.heading')}</PageTitle>
        <SettingsWallet />
        {process.env.USE_MULTI_CURRENCY === 'true' && <SettingsPreferences />}
        <SettingsSecurity defaultPassphraseVisible={defaultPassphraseVisible} defaultMnemonic={defaultMnemonic} />
        <SettingsHelp />
        <SettingsLegal />
        <SettingsRemoveWallet />
      </SectionLayout>
    </Layout>
  );
};
