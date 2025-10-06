import React from 'react';

import { Layout, SectionLayout } from '@src/views/browser-view/components/Layout';
import { EducationalList } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { getEducationalList } from '@src/views/browser-view/features/assets/components/AssetEducationalList/AssetEducationalList';

import { NotificationsCenterContainer } from './NotificationsCenterContainer';

export const NotificationsCenterLayout = (): React.ReactElement => {
  const { t } = useTranslation();

  const educationalItems = getEducationalList(t);

  return (
    <>
      <Layout>
        <SectionLayout
          sidePanelContent={
            <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />
          }
        >
          <NotificationsCenterContainer />
        </SectionLayout>
      </Layout>
    </>
  );
};
