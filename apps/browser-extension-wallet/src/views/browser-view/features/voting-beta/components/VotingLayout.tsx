import React, { ReactElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import { VotingCenterBanner } from './VotingCenterBanner';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { config } from '@src/config';
import { useWalletStore } from '@src/stores';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { getEducationalList } from '../../assets/components/AssetEducationalList/AssetEducationalList';

export const VotingLayout = (): ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const openExternalLink = useExternalLinkOpener();
  const { environmentName } = useWalletStore();
  const { GOV_TOOLS_URLS } = config();

  const educationalList = getEducationalList(t);

  const openLink = useCallback(
    async (url: string) => {
      await analytics.sendEventToPostHog(PostHogAction.VotingBannerButtonClick);

      openExternalLink(url);
    },
    [analytics, openExternalLink]
  );

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={<EducationalList items={educationalList} title={t('browserView.sidePanel.learnAbout')} />}
      >
        <VotingCenterBanner openExternalLink={openLink} govToolUrl={GOV_TOOLS_URLS[environmentName]} />
      </SectionLayout>
    </Layout>
  );
};
