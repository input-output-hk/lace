import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

/**
 * Props for the UnsupportedCertificate component.
 */
export interface UnsupportedCertificateProps {
  /** The certificate type name */
  certificateType: string;
  /** Test identifier */
  testID?: string;
}

/**
 * Displays a fallback view for unsupported certificate types.
 *
 * Shows only the certificate type name when detailed display
 * is not available for a particular certificate type.
 *
 * @param props - Component props
 * @returns React element displaying the certificate type
 */
export const UnsupportedCertificate = ({
  certificateType,
  testID,
}: UnsupportedCertificateProps) => {
  const { t } = useTranslation();

  return (
    <InfoRow
      label={t('dapp-connector.cardano.sign-tx.certificate.type')}
      value={certificateType}
      testID={testID ? `${testID}-type` : undefined}
    />
  );
};
