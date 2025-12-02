import React from 'react';
import styles from './Voting.module.scss';
import { TranslationsFor } from '@wallet/util/types';

type VotingParticipationStatus = 'registered' | 'unregistered';

export interface VotingParticipationProps {
  status: VotingParticipationStatus;
  assetAmount: string;
  assetTicker?: string;
  translations: TranslationsFor<'walletStatus'>;
}

const walletStatusText: Record<VotingParticipationStatus, string> = {
  registered: 'Registered',
  unregistered: 'Unregistered'
};

const assetAmountText: Record<VotingParticipationStatus, string> = {
  registered: 'Voting power',
  unregistered: 'Cardano balance'
};

export const VotingParticipation = ({
  status,
  assetAmount,
  assetTicker,
  translations
}: VotingParticipationProps): React.ReactElement => (
  <div className={styles.votingParticipation}>
    <div className={styles.labeledInfo}>
      <p>{assetAmountText[status]}</p>
      <h5>
        {assetAmount} <span>{assetTicker}</span>
      </h5>
    </div>
    <div className={styles.labeledInfo}>
      <p>{translations.walletStatus}</p>
      <h5>{walletStatusText[status]}</h5>
    </div>
  </div>
);
