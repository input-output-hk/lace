import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import type { DRepDisplayInfo } from '../../../utils';

/**
 * Props for the DRepInfoRows component.
 */
export interface DRepInfoRowsProps {
  /** DRep display information (drepId, alwaysAbstain, alwaysNoConfidence) */
  dRepInfo: DRepDisplayInfo;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays DRep (Delegate Representative) information rows.
 *
 * Renders either a DRep ID or shows "always abstain" / "always no confidence" flags.
 *
 * @param props - Component props
 * @returns React element displaying DRep information
 */
export const DRepInfoRows = ({ dRepInfo, testID }: DRepInfoRowsProps) => {
  const { t } = useTranslation();

  const yesLabel = t('dapp-connector.cardano.sign-tx.certificate.yes');

  return (
    <>
      {dRepInfo.drepId && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.certificate.drep-id')}
          value={dRepInfo.drepId}
          testID={testID ? `${testID}-drep-id` : undefined}
        />
      )}
      {dRepInfo.alwaysAbstain && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.certificate.always-abstain')}
          value={yesLabel}
          testID={testID ? `${testID}-always-abstain` : undefined}
        />
      )}
      {dRepInfo.alwaysNoConfidence && (
        <InfoRow
          label={t(
            'dapp-connector.cardano.sign-tx.certificate.always-no-confidence',
          )}
          value={yesLabel}
          testID={testID ? `${testID}-always-no-confidence` : undefined}
        />
      )}
    </>
  );
};
