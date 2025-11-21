import React from 'react';
import styles from './Voting.module.scss';
import { Button } from '@lace/common';
import BackgroundMask from '../../assets/images/right-side-pool-mask.png';
import { TranslationsFor } from '@wallet/util/types';

export interface WaitForNextFundCardProps {
  isRegistered: boolean;
  onRegistrationRequest: () => void;
  hasEnoughBalance?: boolean;
  translations: TranslationsFor<'phase0' | 'title' | 'message' | 'register' | 'registered'>;
}

export const WaitForNextFundCard = ({
  isRegistered,
  onRegistrationRequest,
  hasEnoughBalance = true,
  translations
}: WaitForNextFundCardProps): React.ReactElement => (
  <div className={styles.waitForNextFundCard}>
    <div className={styles.content}>
      <div>
        <p className={styles.phase}>{translations.phase0}</p>
        <p className={styles.title}>{translations.title}</p>
      </div>
      <p className={styles.message}>{translations.message}</p>
    </div>
    <div className={styles.footer}>
      {isRegistered ? (
        <div className={styles.badge}>{translations.registered}</div>
      ) : (
        <Button disabled={!hasEnoughBalance} onClick={onRegistrationRequest}>
          {translations.register}
        </Button>
      )}
    </div>
    <img className={styles.mask} src={BackgroundMask} />
  </div>
);
