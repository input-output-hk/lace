import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

/**
 * Props for the StakeDelegationCertificate component.
 */
export interface StakeDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** The pool ID being delegated to */
  poolId: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a stake delegation certificate.
 *
 * Shows the certificate type, stake address, and pool ID.
 *
 * @param props - Component props
 * @returns React element displaying stake delegation certificate details
 */
export const StakeDelegationCertificate = ({
  stakeKeyHash,
  poolId,
  testID,
}: StakeDelegationCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t('dapp-connector.cardano.sign-tx.certificate.stake-delegation')}
        testID={testID ? `${testID}-type` : undefined}
      />
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
