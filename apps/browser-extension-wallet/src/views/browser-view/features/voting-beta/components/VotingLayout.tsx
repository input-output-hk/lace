import React, { ReactElement, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { VotingCenterBanner } from './VotingCenterBanner';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { config } from '@src/config';
import { useWalletStore } from '@src/stores';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const VotingLayout = (): ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const openExternalLink = useExternalLinkOpener();
  const { environmentName } = useWalletStore();
  const { GOV_TOOLS_URLS } = config();

  const titles = {
    glossary: t('educationalBanners.title.glossary'),
    faq: t('educationalBanners.title.faq'),
    video: t('educationalBanners.title.video')
  };

  const educationalList = [
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatAreActivityDetails'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=activity`
    },
    {
      title: titles.glossary,
      subtitle: t('browserView.activity.learnAbout.whatIsAnUnconfirmedTransaction'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=unconfirmed-transaction`
    },
    {
      title: titles.faq,
      subtitle: t('browserView.activity.learnAbout.doesLaceHaveFees'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=does-lace-have-fees`
    },
    {
      title: titles.video,
      subtitle: t('browserView.activity.learnAbout.transactionBundles'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=lace-introduces-transaction-bundles`
    }
  ];

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
