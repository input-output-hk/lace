import React from 'react';
import { SettingsWallet, SettingsSecurity, SettingsLegal, SettingsAbout, SettingsHelp, SettingsPreferences } from './';
import { PageTitle } from '@components/Layout';
import { useTranslation } from 'react-i18next';
import { Layout, SectionLayout } from '@src/views/browser-view/components/Layout';
import { SettingsRemoveWallet } from './SettingsRemoveWallet';
import { MidnightPreLaunchSettingsBanner } from '@lace/core';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import MidnightPreLaunchBannerImage from '../../../../../../../../packages/core/src/ui/assets/images/midnight-launch-event-sidebar-banner.png';
import { useExternalLinkOpener } from '@providers';

export interface SettingsLayoutProps {
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: Array<string>;
}

export const SettingsLayout = ({
  defaultPassphraseVisible,
  defaultMnemonic
}: SettingsLayoutProps): React.ReactElement => {
  const { t } = useTranslation();
  const openExternalLink = useExternalLinkOpener();

  const sidePanelContent = (
    <div>
      {process.env.USE_GLACIER_DROP === 'true' ? (
        <Box mb="$32">
          <MidnightPreLaunchSettingsBanner
            bannerImageUrl={MidnightPreLaunchBannerImage}
            onCtaButtonClick={() => openExternalLink(process.env.MIDNIGHT_LEARN_MORE_URL)}
          />
        </Box>
      ) : undefined}
      <SettingsAbout data-testid="about-container" />
    </div>
  );

  return (
    <Layout>
      <SectionLayout sidePanelContent={sidePanelContent}>
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
