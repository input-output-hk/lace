import React from 'react';
import { renderLabel, renderSentAssets, RowContainer } from './OutputSummaryUtils';
import { Typography } from 'antd';
import styles from './OutputSummary.module.scss';
import { TranslationsFor } from '@ui/utils/types';

const { Text } = Typography;

export type SentAssetsList = Array<{
  assetAmount: string;
  fiatAmount: string;
}>;

export interface OutputSummaryProps {
  list: SentAssetsList;
  recipientAddress: string;
  recipientName?: string;
  translations?: TranslationsFor<'recipientAddress' | 'sending'>;
}

export const OutputSummary = ({
  list,
  recipientAddress,
  translations,
  recipientName
}: OutputSummaryProps): React.ReactElement => (
  <div className={styles.container} data-testid="output-summary-container">
    <RowContainer data-testid="output-summary-row">
      {renderLabel({ label: translations.sending, dataTestId: 'output-summary-sending-title' })}
      <div className={styles.assetList} data-testid="output-summary-asset-list">
        {renderSentAssets(list)}
      </div>
    </RowContainer>

    <RowContainer>
      {renderLabel({ label: translations.recipientAddress, dataTestId: 'output-summary-recipient-title' })}
      {recipientName ? (
        <div className={styles.recipient}>
          <Text className={styles.name}>{recipientName}</Text>
          <Text className={styles.address}>{recipientAddress}</Text>
        </div>
      ) : (
        <Text className={styles.recipientAddress} data-testid="output-summary-recipient-address">
          {recipientAddress}
        </Text>
      )}
    </RowContainer>
  </div>
);
