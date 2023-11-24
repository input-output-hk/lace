import React from 'react';
import classNames from 'classnames';
import { Loader } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from './MainLoader.module.scss';

export interface MainLoaderProps {
  text?: string;
  overlay?: boolean;
}

export const MainLoader = ({ text, overlay = false }: MainLoaderProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classNames([styles.loaderContainer, { [styles.overlay]: overlay }])} data-testid="main-loader">
      <Loader className={styles.loader} data-testid="main-loader-image" />
      <p className={styles.loaderText} data-testid="main-loader-text">
        {text ?? t('general.loading')}
      </p>
    </div>
  );
};
