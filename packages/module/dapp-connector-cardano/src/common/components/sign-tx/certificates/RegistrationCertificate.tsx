import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { useFormattedDeposit } from './useFormattedDeposit';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the RegistrationCertificate component.
 */
export interface RegistrationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** Deposit amount in lovelace (optional for legacy certificates) */
  depositLovelace?: bigint;
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
 * Displays details for a stake registration certificate.
 *
 * Shows the certificate type, stake address, and deposit paid (if applicable).
 * Supports both legacy StakeRegistration and Conway era Registration certificates.
 *
 * @param props - Component props
 * @returns React element displaying registration certificate details
 */
export const RegistrationCertificate = ({
  stakeKeyHash,
  depositLovelace,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: RegistrationCertificateProps) => {
  const { t } = useTranslation();

  const {
    hasDeposit,
    formatted: depositFormatted,
    fiat: depositFiat,
  } = useFormattedDeposit({
    depositLovelace,
    coinSymbol,
    tokenPrices,
    currencyTicker,
  });

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.type')}
        value={t(
          'dapp-connector.cardano.sign-tx.certificate.stake-registration',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.stake-key-hash')}
        value={stakeKeyHash}
        testID={testID ? `${testID}-stake-key-hash` : undefined}
      />
      {hasDeposit && (
        <InfoRow
          label={t('dapp-connector.cardano.sign-tx.certificate.deposit-paid')}
          value={depositFormatted}
          secondaryValue={depositFiat}
          testID={testID ? `${testID}-deposit-paid` : undefined}
        />
      )}
    </>
  );
};
