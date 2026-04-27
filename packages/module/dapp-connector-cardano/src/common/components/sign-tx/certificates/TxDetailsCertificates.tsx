import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';

import { CollapsibleSection } from '../CollapsibleSection';

import { CertificateView } from './CertificateView';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the TxDetailsCertificates component.
 */
export interface TxDetailsCertificatesProps {
  /** Array of certificates to display */
  certificates: Cardano.Certificate[];
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (e.g. deposit in DRep registration) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Test identifier */
  testID?: string;
}

/**
 * Container component that renders all certificates in a transaction.
 *
 * Wraps certificates in a CollapsibleSection and displays each certificate
 * using CertificateView, with visual dividers between multiple certificates.
 *
 * @param props - Component props
 * @returns React element displaying all certificates, or null if no certificates
 */
export const TxDetailsCertificates = ({
  certificates,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  testID,
}: TxDetailsCertificatesProps) => {
  const { t } = useTranslation();

  if (certificates.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      title={t('dapp-connector.cardano.sign-tx.certificates-label', {
        count: certificates.length,
      })}
      testID={testID}>
      <Column gap={spacing.L}>
        {certificates.map((certificate, index) => (
          <Column key={`${certificate.__typename}-${index}`} gap={spacing.L}>
            <CertificateView
              certificate={certificate}
              coinSymbol={coinSymbol}
              tokenPrices={tokenPrices}
              currencyTicker={currencyTicker}
              testID={testID ? `${testID}-cert-${index}` : undefined}
            />
            {index < certificates.length - 1 && <Divider />}
          </Column>
        ))}
      </Column>
    </CollapsibleSection>
  );
};
