import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { useFormattedDeposit } from './useFormattedDeposit';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the StakeRegistrationDelegationCertificate component.
 */
export interface StakeRegistrationDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** The pool ID being delegated to */
  poolId: string;
  /** Deposit amount in lovelace */
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
 * Displays details for a combined stake registration and delegation certificate.
 *
 * Shows the certificate type, stake address, pool ID, and deposit paid (with optional fiat).
 *
 * @param props - Component props
 * @returns React element displaying stake registration delegation certificate details
 */
export const StakeRegistrationDelegationCertificate = ({
  stakeKeyHash,
  poolId,
  depositLovelace,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: StakeRegistrationDelegationCertificateProps) => {
  const { t } = useTranslation();

  const { formatted: depositFormatted, fiat: depositFiat } =
    useFormattedDeposit({
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
          'dapp-connector.cardano.sign-tx.certificate.stake-registration-delegation',
        )}
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
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.certificate.deposit-paid')}
        value={depositFormatted}
        secondaryValue={depositFiat}
        testID={testID ? `${testID}-deposit-paid` : undefined}
      />
    </>
  );
};
