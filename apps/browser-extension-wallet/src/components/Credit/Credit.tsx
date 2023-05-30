import React, { ReactElement } from 'react';
import styles from './Credit.module.scss';
import { useTranslation } from 'react-i18next';

interface CreditsProps {
  handleOnClick: () => void;
}

export const Credit = ({ handleOnClick }: CreditsProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={styles.credits} data-testid="coingecko-credits">
      <div>
        {t('general.credit.poweredBy')}{' '}
        <div className={styles.link} onClick={handleOnClick} data-testid="coingecko-link">
          {t('general.credit.coinGecko')}
        </div>
      </div>
    </div>
  );
};
