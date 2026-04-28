import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { formatDeposit } from '../../../utils';
import { calculateAdaFiatValue } from '../../../utils/sign-tx-utils';
import { InfoRow } from '../InfoRow';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the DRepRegistrationCertificate component.
 */
export interface DRepRegistrationCertificateProps {
  /** The bech32-encoded DRep ID */
  drepId: Cardano.DRepID;
  /** Deposit amount in lovelace (used with formatDeposit for display) */
  depositLovelace: bigint;
  /** Coin symbol (e.g. "ADA", "tADA") */
  coinSymbol: string;
  /** Optional anchor URL for the DRep metadata */
  anchorUrl?: string;
  /** Optional anchor data hash */
  anchorHash?: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a DRep registration certificate.
 *
 * Rows: Type (DRep Registration), Anchor URL, Anchor Hash, Deposit paid (formatted + fiat).
 *
 * @param props - Component props
 * @returns React element displaying DRep registration certificate details
 */
export const DRepRegistrationCertificate = ({
  drepId,
  depositLovelace,
  coinSymbol,
  anchorUrl,
  anchorHash,
  tokenPrices,
  currencyTicker,
  testID,
}: DRepRegistrationCertificateProps) => {
  const { t } = useTranslation();

  const depositFormatted = formatDeposit(depositLovelace, coinSymbol);
  const depositFiat = calculateAdaFiatValue(
    depositLovelace,
    tokenPrices,
    currencyTicker,
  );

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t(
          'dapp-connector.cardano.sign-tx.certificate.drep-registration',
        )}
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
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.deposit-paid')}
        value={depositFormatted}
        secondaryValue={depositFiat}
        testID={testID ? `${testID}-deposit-paid` : undefined}
      />
    </>
  );
};
