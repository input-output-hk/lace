import { Cardano } from '@cardano-sdk/core';
import { Column, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';

import {
  formatDRepId,
  formatStakeKeyHash,
  getDRepDisplayInfo,
} from '../../../utils';

import { AuthorizeCommitteeCertificate } from './AuthorizeCommitteeCertificate';
import { DRepRegistrationCertificate } from './DRepRegistrationCertificate';
import { DRepRetirementCertificate } from './DRepRetirementCertificate';
import { DRepUpdateCertificate } from './DRepUpdateCertificate';
import { RegistrationCertificate } from './RegistrationCertificate';
import { ResignCommitteeCertificate } from './ResignCommitteeCertificate';
import { StakeDelegationCertificate } from './StakeDelegationCertificate';
import { StakeRegistrationDelegationCertificate } from './StakeRegistrationDelegationCertificate';
import { StakeVoteDelegationCertificate } from './StakeVoteDelegationCertificate';
import { StakeVoteRegistrationDelegationCertificate } from './StakeVoteRegistrationDelegationCertificate';
import { UnregistrationCertificate } from './UnregistrationCertificate';
import { UnsupportedCertificate } from './UnsupportedCertificate';
import { VoteDelegationCertificate } from './VoteDelegationCertificate';
import { VoteRegistrationDelegationCertificate } from './VoteRegistrationDelegationCertificate';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the CertificateView component.
 */
export interface CertificateViewProps {
  /** The Cardano certificate to display */
  certificate: Cardano.Certificate;
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional, e.g. for deposit in DRep registration) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Test identifier */
  testID?: string;
}

/**
 * Type guard to check if certificate is a new stake address certificate (has deposit).
 *
 * @param cert - The certificate to check
 * @returns True if the certificate is a Registration or Unregistration type
 */
const isNewStakeAddressCertificate = (
  cert: Cardano.Certificate,
): cert is Cardano.NewStakeAddressCertificate =>
  cert.__typename === Cardano.CertificateType.Registration ||
  cert.__typename === Cardano.CertificateType.Unregistration;

/**
 * Converts certificate __typename to a stable kebab-case slug for testIDs.
 *
 * @example "RegisterDelegateRepresentativeCertificate" -> "register-delegate-representative"
 */
const getCertificateTypeSlug = (typename: string): string =>
  typename
    .replace(/Certificate$/i, '')
    .replaceAll(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

/**
 * Routes a Cardano certificate to its appropriate display component.
 *
 * Handles all supported certificate types with proper formatting for:
 * - Stake addresses (bech32 format)
 * - DRep IDs (bech32 format)
 * - Deposit amounts (with coin symbol)
 * - Anchor URLs and hashes
 * - Committee credentials
 *
 * @param props - Component props including certificate, network ID, and coin symbol
 * @returns React element for the specific certificate type
 */
export const CertificateView = ({
  certificate,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: CertificateViewProps) => {
  const contentTestID = testID
    ? `${testID}-content-${getCertificateTypeSlug(certificate.__typename)}`
    : undefined;

  const renderCertificateContent = (): React.ReactElement => {
    switch (certificate.__typename) {
      case Cardano.CertificateType.StakeRegistration:
      case Cardano.CertificateType.Registration:
        return (
          <RegistrationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            depositLovelace={
              isNewStakeAddressCertificate(certificate)
                ? certificate.deposit
                : undefined
            }
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.StakeDeregistration:
      case Cardano.CertificateType.Unregistration:
        return (
          <UnregistrationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            depositLovelace={
              isNewStakeAddressCertificate(certificate)
                ? certificate.deposit
                : undefined
            }
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.StakeDelegation:
        return (
          <StakeDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            poolId={certificate.poolId}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.StakeVoteDelegation:
        return (
          <StakeVoteDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            poolId={certificate.poolId}
            dRepInfo={getDRepDisplayInfo(certificate.dRep)}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.StakeRegistrationDelegation:
        return (
          <StakeRegistrationDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            poolId={certificate.poolId}
            depositLovelace={certificate.deposit}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.StakeVoteRegistrationDelegation:
        return (
          <StakeVoteRegistrationDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            poolId={certificate.poolId}
            depositLovelace={certificate.deposit}
            coinSymbol={coinSymbol}
            dRepInfo={getDRepDisplayInfo(certificate.dRep)}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.VoteRegistrationDelegation:
        return (
          <VoteRegistrationDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            depositLovelace={certificate.deposit}
            coinSymbol={coinSymbol}
            dRepInfo={getDRepDisplayInfo(certificate.dRep)}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.RegisterDelegateRepresentative: {
        const anchorDataHash = certificate.anchor?.dataHash;
        return (
          <DRepRegistrationCertificate
            drepId={formatDRepId(certificate.dRepCredential.hash)}
            depositLovelace={certificate.deposit}
            coinSymbol={coinSymbol}
            anchorUrl={certificate.anchor?.url}
            anchorHash={
              anchorDataHash !== undefined && anchorDataHash !== null
                ? String(anchorDataHash)
                : undefined
            }
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );
      }

      case Cardano.CertificateType.UnregisterDelegateRepresentative:
        return (
          <DRepRetirementCertificate
            drepId={formatDRepId(certificate.dRepCredential.hash)}
            depositLovelace={certificate.deposit}
            coinSymbol={coinSymbol}
            tokenPrices={tokenPrices}
            currencyTicker={currencyTicker}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.UpdateDelegateRepresentative: {
        const anchorDataHash = certificate.anchor?.dataHash;
        return (
          <DRepUpdateCertificate
            drepId={formatDRepId(certificate.dRepCredential.hash)}
            anchorUrl={certificate.anchor?.url}
            anchorHash={
              anchorDataHash !== undefined && anchorDataHash !== null
                ? String(anchorDataHash)
                : undefined
            }
            testID={contentTestID}
          />
        );
      }

      case Cardano.CertificateType.VoteDelegation:
        return (
          <VoteDelegationCertificate
            stakeKeyHash={formatStakeKeyHash(certificate.stakeCredential)}
            dRepInfo={getDRepDisplayInfo(certificate.dRep)}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.AuthorizeCommitteeHot:
        return (
          <AuthorizeCommitteeCertificate
            coldCredential={certificate.coldCredential.hash.toString()}
            hotCredential={certificate.hotCredential.hash.toString()}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.ResignCommitteeCold:
        return (
          <ResignCommitteeCertificate
            coldCredential={certificate.coldCredential.hash.toString()}
            anchorUrl={certificate.anchor?.url}
            anchorHash={certificate.anchor?.dataHash}
            testID={contentTestID}
          />
        );

      case Cardano.CertificateType.PoolRegistration:
      case Cardano.CertificateType.PoolRetirement:
      case Cardano.CertificateType.MIR:
      case Cardano.CertificateType.GenesisKeyDelegation:
        return (
          <UnsupportedCertificate
            certificateType={certificate.__typename}
            testID={contentTestID}
          />
        );

      default: {
        const exhaustiveCheck: never = certificate;
        return (
          <UnsupportedCertificate
            certificateType={
              (exhaustiveCheck as Cardano.Certificate).__typename
            }
            testID={contentTestID}
          />
        );
      }
    }
  };

  return (
    <Column gap={spacing.L} testID={testID}>
      <Column gap={spacing.L} testID={contentTestID}>
        {renderCertificateContent()}
      </Column>
    </Column>
  );
};
