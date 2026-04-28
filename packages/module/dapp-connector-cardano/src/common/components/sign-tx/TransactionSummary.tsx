import React from 'react';

import { CollapsibleSection } from './CollapsibleSection';
import { InfoRow } from './InfoRow';
import { TokenAmount } from './TokenAmount';

import type { UseTransactionSummaryDataResult } from '../../hooks/useTransactionSummaryData';

/** Transaction summary: net balance and asset list in a collapsible. */
export interface TransactionSummaryProps
  extends Pick<
    UseTransactionSummaryDataResult,
    | 'assetList'
    | 'coinSymbol'
    | 'formattedFiatNetCoinBalance'
    | 'formattedNetCoinBalance'
  > {
  title: string;
  showInfoIcon?: boolean;
  defaultOpen?: boolean;
  /** Base test ID; children use -net-balance, -asset-0, -asset-1, … */
  testID?: string;
}

/** Net coin balance and asset list in a collapsible (SignTx summary section). */
export const TransactionSummary = ({
  title,
  showInfoIcon = false,
  defaultOpen = true,
  testID,
  formattedNetCoinBalance,
  formattedFiatNetCoinBalance,
  assetList,
  coinSymbol,
}: TransactionSummaryProps) => (
  <CollapsibleSection
    title={title}
    showInfoIcon={showInfoIcon}
    defaultOpen={defaultOpen}
    testID={testID}>
    <InfoRow
      value={`${formattedNetCoinBalance} ${coinSymbol}`}
      secondaryValue={formattedFiatNetCoinBalance}
      testID={testID ? `${testID}-net-balance` : undefined}
    />
    {assetList.map((asset, index) => (
      <InfoRow
        key={`asset-${asset.symbol}-${index}`}
        value={
          <TokenAmount
            amount={asset.formattedAmount}
            symbol={asset.symbol}
            isPositive={asset.isPositive}
            imageUrl={asset.imageUrl}
            testID={testID ? `${testID}-asset-${index}` : undefined}
          />
        }
      />
    ))}
  </CollapsibleSection>
);
