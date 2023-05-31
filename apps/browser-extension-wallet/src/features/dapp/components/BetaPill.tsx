import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './BetaPill.module.scss';

export const BetaPill = (): JSX.Element => {
  const { t } = useTranslation();
  return (
    <a
      className={styles.betaPill}
      data-testid="beta-pill"
      href={process.env.FAQ_URL}
      target="_blank"
      rel="noreferrer noopener"
    >
      {t('core.dapp.beta')}
    </a>
  );
};
