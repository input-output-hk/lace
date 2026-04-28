import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { DRepInfoRows } from './DRepInfoRows';

import type { DRepDisplayInfo } from '../../../utils';

/**
 * Props for the StakeVoteDelegationCertificate component.
 */
export interface StakeVoteDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** The pool ID being delegated to */
  poolId: string;
  /** DRep display information (drepId, alwaysAbstain, alwaysNoConfidence) */
  dRepInfo: DRepDisplayInfo;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a combined stake and vote delegation certificate.
 *
 * Shows the certificate type, stake address, pool ID, and DRep information.
 *
 * @param props - Component props
 * @returns React element displaying stake and vote delegation certificate details
 */
export const StakeVoteDelegationCertificate = ({
  stakeKeyHash,
  poolId,
  dRepInfo,
  testID,
}: StakeVoteDelegationCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t(
          'dapp-connector.cardano.sign-tx.certificate.stake-vote-delegation',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <DRepInfoRows dRepInfo={dRepInfo} testID={testID} />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.pool-id')}
        value={poolId}
        testID={testID ? `${testID}-pool-id` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.stake-key-hash')}
        value={stakeKeyHash}
        testID={testID ? `${testID}-stake-key-hash` : undefined}
      />
    </>
  );
};
