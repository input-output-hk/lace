import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { DRepInfoRows } from './DRepInfoRows';

import type { DRepDisplayInfo } from '../../../utils';

/**
 * Props for the VoteDelegationCertificate component.
 */
export interface VoteDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** DRep display information (drepId, alwaysAbstain, alwaysNoConfidence) */
  dRepInfo: DRepDisplayInfo;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a vote delegation certificate.
 *
 * Rows: Type (Vote Delegation); DRepInfoRows (DRep ID, or Always Abstain, or Always No Confidence);
 * when dRepId: Stake Key Hash after DRep ID.
 *
 * @param props - Component props
 * @returns React element displaying vote delegation certificate details
 */
export const VoteDelegationCertificate = ({
  stakeKeyHash,
  dRepInfo,
  testID,
}: VoteDelegationCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t('dapp-connector.cardano.sign-tx.certificate.vote-delegation')}
        testID={testID ? `${testID}-type` : undefined}
      />
      <DRepInfoRows dRepInfo={dRepInfo} testID={testID} />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.stake-key-hash')}
        value={stakeKeyHash}
        testID={testID ? `${testID}-stake-key-hash` : undefined}
      />
    </>
  );
};
