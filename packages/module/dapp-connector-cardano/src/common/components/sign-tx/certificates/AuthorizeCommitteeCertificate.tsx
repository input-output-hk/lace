import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

/**
 * Props for the AuthorizeCommitteeCertificate component.
 */
export interface AuthorizeCommitteeCertificateProps {
  /** The cold credential hash */
  coldCredential: string;
  /** The hot credential hash */
  hotCredential: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a committee hot key authorization certificate.
 *
 * Shows the certificate type, cold credential, and hot credential.
 *
 * @param props - Component props
 * @returns React element displaying authorize committee certificate details
 */
export const AuthorizeCommitteeCertificate = ({
  coldCredential,
  hotCredential,
  testID,
}: AuthorizeCommitteeCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t(
          'dapp-connector.cardano.sign-tx.certificate.authorize-committee-hot',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.cold-credential')}
        value={coldCredential}
        testID={testID ? `${testID}-cold-credential` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.hot-credential')}
        value={hotCredential}
        testID={testID ? `${testID}-hot-credential` : undefined}
      />
    </>
  );
};
