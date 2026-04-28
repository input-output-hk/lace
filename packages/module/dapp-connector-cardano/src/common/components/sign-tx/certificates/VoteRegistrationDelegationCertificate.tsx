import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { DRepInfoRows } from './DRepInfoRows';
import { useFormattedDeposit } from './useFormattedDeposit';

import type { DRepDisplayInfo } from '../../../utils';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the VoteRegistrationDelegationCertificate component.
 */
export interface VoteRegistrationDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** Deposit amount in lovelace */
  depositLovelace: bigint;
  /** Coin symbol (e.g. "ADA", "tADA") */
  coinSymbol: string;
  /** DRep display information (drepId, alwaysAbstain, alwaysNoConfidence) */
  dRepInfo: DRepDisplayInfo;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays details for a vote registration with delegation certificate.
 *
 * Shows the certificate type, stake address, deposit paid, and DRep info.
 *
 * @param props - Component props
 * @returns React element displaying vote registration delegation certificate details
 */
export const VoteRegistrationDelegationCertificate = ({
  stakeKeyHash,
  depositLovelace,
  coinSymbol,
  dRepInfo,
  tokenPrices,
  currencyTicker,
  testID,
}: VoteRegistrationDelegationCertificateProps) => {
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
          'dapp-connector.cardano.sign-tx.certificate.vote-registration-delegation',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <DRepInfoRows dRepInfo={dRepInfo} testID={testID} />
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
