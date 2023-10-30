import React, { useCallback } from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import SadFaceIcon from '@lace/core/src/ui/assets/icons/sad-face.component.svg';
import styles from './styles.module.scss';
import { Button } from '@lace/common';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { Layout } from '../Layout';
import connectStyles from '../Connect.module.scss';

const { Text } = Typography;

export const InsufficientFunds = (): React.ReactElement => {
  const { t } = useTranslation();
  const backgroundServices = useBackgroundServiceAPIContext();

  const close = useCallback(() => {
    window.close();
  }, []);

  const rejectAndOpenFunds = useCallback(() => {
    backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.HOME }).then(close);
  }, [close, backgroundServices]);

  return (
    <Layout
      pageClassname={styles.spaceBetween}
      title={t('dapp.collateral.insufficientFunds.title')}
      data-testid="dapp-set-collateral-layout"
    >
      <div className={styles.insufficientFunds}>
        <SadFaceIcon className={styles.sadFace} data-testid="collateral-sad-face-icon" />
        <Text className={styles.sadFaceDescription} data-testid="collateral-not-enough-ada-error">
          {t('dapp.collateral.insufficientFunds.description')}
        </Text>
      </div>
      <div className={connectStyles.footer}>
        <Button block onClick={rejectAndOpenFunds} data-testid="collateral-button-add-funds">
          {t('dapp.collateral.insufficientFunds.add')}
        </Button>
        <Button block color="secondary" onClick={close} data-testid="collateral-button-cancel">
          {t('general.button.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
