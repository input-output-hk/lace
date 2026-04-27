import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { InfoRow } from '../InfoRow';

import { DRepInfoRows } from './DRepInfoRows';
import { useFormattedDeposit } from './useFormattedDeposit';

import type { DRepDisplayInfo } from '../../../utils';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the StakeVoteRegistrationDelegationCertificate component.
 */
export interface StakeVoteRegistrationDelegationCertificateProps {
  /** The stake key hash (hex string) */
  stakeKeyHash: string;
  /** The pool ID being delegated to */
  poolId: string;
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
 * Displays details for a combined stake and vote registration with delegation certificate.
 *
 * Shows the certificate type, stake address, pool ID, deposit paid, and DRep info.
 *
 * @param props - Component props
 * @returns React element displaying stake vote registration delegation certificate details
 */
export const StakeVoteRegistrationDelegationCertificate = ({
  stakeKeyHash,
  poolId,
  depositLovelace,
  coinSymbol,
  dRepInfo,
  tokenPrices,
  currencyTicker,
  testID,
}: StakeVoteRegistrationDelegationCertificateProps) => {
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
          'dapp-connector.cardano.sign-tx.certificate.stake-vote-registration-delegation',
        )}
        testID={testID ? `${testID}-type` : undefined}
      />
      <DRepInfoRows dRepInfo={dRepInfo} testID={testID} />
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
