import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { useFormattedDeposit } from './useFormattedDeposit';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the UnregistrationCertificate component.
 */
export interface UnregistrationCertificateProps {
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
 * Displays details for a stake deregistration certificate.
 *
 * Shows the certificate type, stake address, and deposit returned (if applicable).
 * Supports both legacy StakeDeregistration and Conway era Unregistration certificates.
 *
 * @param props - Component props
 * @returns React element displaying unregistration certificate details
 */
export const UnregistrationCertificate = ({
  stakeKeyHash,
  depositLovelace,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: UnregistrationCertificateProps) => {
  const { t } = useTranslation();

  const {
    hasDeposit,
    formatted: depositReturned,
    fiat: depositReturnedFiat,
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
          'dapp-connector.cardano.sign-tx.certificate.stake-deregistration',
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
          label={t(
            'dapp-connector.cardano.sign-tx.certificate.deposit-returned',
          )}
          value={depositReturned}
          secondaryValue={depositReturnedFiat}
          testID={testID ? `${testID}-deposit-returned` : undefined}
        />
      )}
    </>
  );
};
