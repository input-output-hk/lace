import React from 'react';

import { Layout, SectionLayout } from '@src/views/browser-view/components/Layout';
import { EducationalList } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { getEducationalList } from '@src/views/browser-view/features/assets/components/AssetEducationalList/AssetEducationalList';

import { Box, Flex } from '@input-output-hk/lace-ui-toolkit';
import { SectionTitle } from '@components/Layout/SectionTitle';
import { NavigationButton } from '@lace/common';
import { useHistory } from 'react-router';
import styles from './NotificationsCenter.module.scss';

export const NotificationDetails = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const educationalItems = getEducationalList(t);

  const onBack = () => {
    history.goBack();
  };

  return (
    <>
      <Layout>
        <SectionLayout
          sidePanelContent={
            <EducationalList items={educationalItems} title={t('browserView.sidePanel.aboutYourWallet')} />
          }
        >
          <Box mb={'$0'}>
            <SectionTitle
              classname={styles.sectionTitle}
              title={
                <Flex alignItems="center" gap="$8">
                  <NavigationButton icon="arrow" onClick={onBack} />
                  {t('notificationsCenter.title')}
                </Flex>
              }
            />
          </Box>
          <div>
            <h1>Notification Details</h1>
          </div>
        </SectionLayout>
      </Layout>
    </>
  );
};
