import React, { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { EducationalList, SectionLayout, Layout } from '@src/views/browser-view/components';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { VotingCenterBanner } from './VotingCenterBanner';
import { useExternalLinkOpener } from '@providers';
import { config } from '@src/config';
import { useWalletStore } from '@src/stores';

export const VotingLayout = (): ReactElement => {
  const { t } = useTranslation();
  // const analytics = useAnalyticsContext();
  // const sendAnalytics = useCallback(() => {
  //   analytics.sendEventToPostHog(PostHogAction.ActivityActivityActivityRowClick);
  // }, [analytics]);

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
      subtitle: t('educationalBanners.subtitle.whatIsADigitalAsset'),
      src: Book,
      link: `${process.env.WEBSITE_URL}/glossary?term=asset`
    },
    {
      title: titles.faq,
      subtitle: t('educationalBanners.subtitle.howToSendReceiveFunds'),
      src: LightBulb,
      link: `${process.env.WEBSITE_URL}/faq?question=how-do-i-send-and-receive-digital-assets`
    },
    {
      title: titles.video,
      subtitle: t('educationalBanners.subtitle.secureSelfCustody'),
      src: Video,
      link: `${process.env.WEBSITE_URL}/learn?video=how-lace-gives-you-full-control-of-your-private-keys`
    }
  ];

  return (
    <Layout>
      <SectionLayout
        sidePanelContent={<EducationalList items={educationalList} title={t('browserView.sidePanel.learnAbout')} />}
      >
        <VotingCenterBanner openExternalLink={openExternalLink} govToolUrl={GOV_TOOLS_URLS[environmentName]} />
      </SectionLayout>
    </Layout>
  );
};
