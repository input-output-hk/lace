import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Book from '@assets/icons/book.svg';
import LightBulb from '@assets/icons/light.svg';
import Video from '@assets/icons/video.svg';
import { EducationalList } from '@src/views/browser-view/components/EducationalList';

const faqKey = 'educationalBanners.title.faq';

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
        title: t(faqKey),
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
      },
      {
        title: t(faqKey),
        subtitle: t('educationalBanners.subtitle.conwayEra'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=how-is-the-conway-ledger-era-also-called-governance-era-supported-by-lace`
      },
      {
        title: t(faqKey),
        subtitle: t('educationalBanners.subtitle.governanceFeatures'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=what-type-of-governance-features-are-supported-in-lace-using-the-govtool-in-the-current`
      },
      {
        title: t(faqKey),
        subtitle: t('educationalBanners.subtitle.governanceActions'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=what-type-of-governance-actions-are-supported-by-lace`
      }
    ],
    [t]
  );

  return <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />;
};
