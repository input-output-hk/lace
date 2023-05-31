import React from 'react';
import Icon from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { BrowserViewSections } from '@src/lib/scripts/types';
import ExpandIcon from '../../../../assets/icons/expand-gradient.component.svg';
import styles from './ExpandViewBanner.module.scss';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';

export const ExpandViewBanner = (): React.ReactElement => {
  const { t } = useTranslation();
  const backgroundServices = useBackgroundServiceAPIContext();

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.title}>{t('staking.expandView.title')}</div>
        <div className={styles.description}>{t('staking.expandView.description')}</div>
        <Button
          onClick={() => backgroundServices.handleOpenBrowser({ section: BrowserViewSections.STAKING })}
          className={styles.button}
          size="large"
          color="gradient"
        >
          <Icon component={ExpandIcon} className={styles.icon} />
          {t('staking.expandView.button')}
        </Button>
      </div>
    </div>
  );
};
