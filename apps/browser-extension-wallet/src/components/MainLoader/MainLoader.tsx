import React from 'react';
import { Loader } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './MainLoader.module.scss';

export interface MainLoaderProps {
  text?: string;
}

export const MainLoader = ({ text }: MainLoaderProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={styles.loaderContainer} data-testid="main-loader">
      <Loader className={styles.loader} data-testid="main-loader-image" />
      <p data-testid="main-loader-text">{text ?? t('general.loading')}</p>
    </div>
  );
};
