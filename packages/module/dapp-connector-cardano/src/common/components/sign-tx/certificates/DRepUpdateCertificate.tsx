import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Props for the DRepUpdateCertificate component.
 */
export interface DRepUpdateCertificateProps {
  /** The bech32-encoded DRep ID */
  drepId: Cardano.DRepID;
  /** Optional anchor URL for the DRep metadata */
  anchorUrl?: string;
  /** Optional anchor data hash */
  anchorHash?: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a DRep update certificate.
 *
 * Rows: Type (DRep Update), DRep ID, Anchor URL, Anchor Hash.
 *
 * @param props - Component props
 * @returns React element displaying DRep update certificate details
 */
export const DRepUpdateCertificate = ({
  drepId,
  anchorUrl,
  anchorHash,
  testID,
}: DRepUpdateCertificateProps) => {
  const { t } = useTranslation();

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t('dapp-connector.cardano.sign-tx.certificate.drep-update')}
        testID={testID ? `${testID}-type` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.drep-id')}
        value={drepId}
        testID={testID ? `${testID}-drep-id` : undefined}
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
