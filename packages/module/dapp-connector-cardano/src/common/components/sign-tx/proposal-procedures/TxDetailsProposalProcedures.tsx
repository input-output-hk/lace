import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing } from '@lace-lib/ui-toolkit';
import React from 'react';

import { CollapsibleSection } from '../CollapsibleSection';

import { ProposalProcedureAction } from './ProposalProcedureAction';

import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Props for the TxDetailsProposalProcedures component.
 */
export interface TxDetailsProposalProceduresProps {
  /** Array of proposal procedures to display */
  proposalProcedures: Cardano.ProposalProcedure[];
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** Test identifier */
  testID?: string;
}

/**
 * Wrapper component that renders a list of proposal procedure details.
 *
 * Displays proposal procedures within a collapsible section with visual
 * separation between multiple proposals.
 *
 * @param props - Component props
 * @returns React element displaying all proposal procedures with proper separation
 */
export const TxDetailsProposalProcedures = ({
  proposalProcedures,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  testID,
}: TxDetailsProposalProceduresProps) => {
  const { t } = useTranslation();

  if (proposalProcedures.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      title={t('dapp-connector.cardano.sign-tx.proposal-procedures-label', {
        count: proposalProcedures.length,
      })}
      testID={testID}>
      <Column gap={spacing.L}>
        {proposalProcedures.map((procedure, index) => (
          <Column
            gap={spacing.L}
            key={`${procedure.governanceAction.__typename}_${procedure.anchor.dataHash}`}>
            <ProposalProcedureAction
              proposalProcedure={procedure}
              coinSymbol={coinSymbol}
              tokenPrices={tokenPrices}
              currencyTicker={currencyTicker}
              explorerBaseUrl={explorerBaseUrl}
              testID={testID ? `${testID}-procedure-${index}` : undefined}
            />
            {index < proposalProcedures.length - 1 && <Divider />}
          </Column>
        ))}
      </Column>
    </CollapsibleSection>
  );
};
