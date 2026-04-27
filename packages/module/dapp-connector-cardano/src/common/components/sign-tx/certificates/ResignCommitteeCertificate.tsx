import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

/**
 * Props for the ResignCommitteeCertificate component.
 */
export interface ResignCommitteeCertificateProps {
  /** The cold credential hash */
  coldCredential: string;
  /** Optional anchor URL */
  anchorUrl?: string;
  /** Optional anchor data hash */
  anchorHash?: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a committee cold key resignation certificate.
 *
 * Shows the certificate type, cold credential, and optional anchor information.
 *
 * @param props - Component props
 * @returns React element displaying resign committee certificate details
 */
export const ResignCommitteeCertificate = ({
  coldCredential,
  anchorUrl,
  anchorHash,
  testID,
}: ResignCommitteeCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t(
          'dapp-connector.cardano.sign-tx.certificate.resign-committee-cold',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.cold-credential')}
        value={coldCredential}
        testID={testID ? `${testID}-cold-credential` : undefined}
      />
      {anchorUrl && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.certificate.anchor-url')}
          value={anchorUrl}
          testID={testID ? `${testID}-anchor-url` : undefined}
        />
      )}
      {anchorHash && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.certificate.anchor-hash')}
          value={anchorHash}
          testID={testID ? `${testID}-anchor-hash` : undefined}
        />
      )}
    </>
  );
};
