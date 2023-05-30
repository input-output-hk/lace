import React from 'react';
import styles from './Voting.module.scss';
import { TranslationsFor } from '@wallet/util/types';

export interface CurrentCatalystFundProps {
  fundNumber: number;
  fundName: string;
  registrationEndsAt: string;
  translations: TranslationsFor<'endOfRegistration'>;
}

export const CurrentCatalystFund = ({
  fundNumber,
  fundName,
  registrationEndsAt,
  translations
}: CurrentCatalystFundProps): React.ReactElement => (
  <div className={styles.currentFund}>
    <div className={styles.title}>
      <h5>Fund {fundNumber}</h5>
      <p>{fundName}</p>
    </div>
    <p className={styles.registrationDeadline}>
      <b>{registrationEndsAt}</b> {translations.endOfRegistration}
    </p>
  </div>
);
