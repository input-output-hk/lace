import React from 'react';
import { OutputSummary, OutputSummaryProps } from '../OutputSummary/OutputSummary';
import { renderAmountInfo, renderLabel, RowContainer } from '../OutputSummary/OutputSummaryUtils';
import { Typography } from 'antd';
import styles from './OutputSummaryList.module.scss';
import { TranslationsFor } from '@ui/utils/types';

const { Text } = Typography;

type TootipText = {
  tootipText?: string;
};

export type Costs = {
  ada: string;
  fiat: string;
};

export interface OutputSummaryListProps {
  rows: OutputSummaryProps[];
  txFee: Costs & TootipText;
  deposit?: Costs & TootipText;
  metadata?: string;
  translations: TranslationsFor<'recipientAddress' | 'sending' | 'txFee' | 'deposit' | 'metadata' | 'output'>;
  ownAddresses?: string[];
  addressToNameMap?: Map<string, string>;
  onFeeTooltipHover?: () => unknown;
  onDepositTooltipHover?: () => unknown;
}

export const OutputSummaryList = ({
  rows,
  txFee,
  metadata,
  deposit,
  translations,
  ownAddresses,
  addressToNameMap,
  onFeeTooltipHover,
  onDepositTooltipHover
}: OutputSummaryListProps): React.ReactElement => {
  const outputSummaryTranslations = {
    recipientAddress: translations.recipientAddress,
    sending: translations.sending
  };

  return (
    <div className={styles.listContainer}>
      {rows.map((row, idx) => (
        <div className={styles.outputRow} key={`${idx}-${row.recipientAddress}`} data-testid="bundle-summary-row">
          {rows.length > 1 && (
            <Text className={styles.title} data-testid="bundle-summary-title">{`${translations.output} ${
              idx + 1
            }`}</Text>
          )}
          <OutputSummary
            {...row}
            translations={outputSummaryTranslations}
            ownAddresses={ownAddresses}
            addressToNameMap={addressToNameMap}
          />
        </div>
      ))}

      {metadata && (
        <div className={styles.metadataRow} data-testid="metadata-container">
          <Text className={styles.metadataLabel} data-testid="metadata-label">
            {translations.metadata}
          </Text>
          <Text className={styles.metadata} data-testid="metadata-value">
            {metadata}
          </Text>
        </div>
      )}

      <div className={styles.feeContainer} data-testid="summary-fee-container">
        {deposit && (
          <RowContainer>
            {renderLabel({
              label: translations.deposit,
              tooltipContent: txFee.tootipText,
              dataTestId: 'summary-fee',
              onTooltipHover: onDepositTooltipHover
            })}
            {renderAmountInfo(txFee.ada, txFee.fiat)}
          </RowContainer>
        )}

        <RowContainer>
          {renderLabel({
            label: translations.txFee,
            tooltipContent: txFee.tootipText,
            dataTestId: 'summary-fee',
            onTooltipHover: onFeeTooltipHover
          })}
          <div>{renderAmountInfo(txFee.ada, txFee.fiat)}</div>
        </RowContainer>
      </div>
    </div>
  );
};
