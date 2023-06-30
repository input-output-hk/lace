import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { EducationalList } from '@src/views/browser-view/components/EducationalList';

export const AssetEducationalList = (): React.ReactElement => {
  const { t } = useTranslation();

  const educationalItems = useMemo(
    () => [
      {
        title: t('educationalBanners.title.glossary'),
        subtitle: t('educationalBanners.subtitle.whatIsADigitalAsset'),
        src: Book,
        link: `${process.env.WEBSITE_URL}/glossary?term=asset`
      },
      {
        title: t('educationalBanners.title.faq'),
        subtitle: t('educationalBanners.subtitle.howToSendReceiveFunds'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=how-do-i-send-and-receive-digital-assets`
      },
      {
        title: t('educationalBanners.title.video'),
        subtitle: t('educationalBanners.subtitle.secureSelfCustody'),
        src: Video,
        link: `${process.env.WEBSITE_URL}/learn?video=how-lace-gives-you-full-control-of-your-private-keys`
      },
      {
        title: t('educationalBanners.title.video'),
        subtitle: t('educationalBanners.subtitle.connectingDApps'),
        src: Video,
        link: `${process.env.WEBSITE_URL}/learn?video=connecting-to-dapps-with-lace`
      }
    ],
    [t]
  );

  return <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />;
};
