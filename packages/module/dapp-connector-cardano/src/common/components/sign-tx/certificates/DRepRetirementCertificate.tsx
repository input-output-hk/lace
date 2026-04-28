import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { formatDeposit } from '../../../utils';
import { calculateAdaFiatValue } from '../../../utils/sign-tx-utils';
import { InfoRow } from '../InfoRow';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the DRepRetirementCertificate component.
 */
export interface DRepRetirementCertificateProps {
  /** The bech32-encoded DRep ID */
  drepId: Cardano.DRepID;
  /** Deposit amount in lovelace (returned when DRep retires) */
  depositLovelace: bigint;
  /** Coin symbol (e.g. "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a DRep retirement/unregistration certificate.
 *
 * Rows: Type (DRep Retirement), DRep ID, Deposit returned (with optional fiat).
 *
 * @param props - Component props
 * @returns React element displaying DRep retirement certificate details
 */
export const DRepRetirementCertificate = ({
  drepId,
  depositLovelace,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: DRepRetirementCertificateProps) => {
  const { t } = useTranslation();

  const depositReturned = formatDeposit(depositLovelace, coinSymbol);
  const depositReturnedFiat = calculateAdaFiatValue(
    depositLovelace,
    tokenPrices,
    currencyTicker,
  );

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t('dapp-connector.cardano.sign-tx.certificate.drep-retirement')}
        testID={testID ? `${testID}-type` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.drep-id')}
        value={drepId}
        testID={testID ? `${testID}-drep-id` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.deposit-returned')}
        value={depositReturned}
        secondaryValue={depositReturnedFiat}
        testID={testID ? `${testID}-deposit-returned` : undefined}
      />
    </>
  );
};
