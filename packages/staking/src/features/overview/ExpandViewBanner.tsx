import Icon from '@ant-design/icons';
import { Button } from '@lace/common';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import ExpandIcon from './expand-gradient.component.svg';
import styles from './ExpandViewBanner.module.scss';

export const ExpandViewBanner = (): React.ReactElement => {
  const { t } = useTranslation();
  const { expandStakingView } = useOutsideHandles();

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.title}>{t('popup.expandBanner.title')}</div>
        <div className={styles.description}>{t('popup.expandBanner.description')}</div>
        <Button onClick={expandStakingView} className={styles.button} size="large" color="gradient">
          <Icon component={ExpandIcon} className={styles.icon} />
          {t('popup.expandBanner.button')}
        </Button>
      </div>
    </div>
  );
};
