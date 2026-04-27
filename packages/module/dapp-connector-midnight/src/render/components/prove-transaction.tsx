import { Box, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayout, DappInfo } from '@lace-lib/ui-extension';
import React from 'react';

export interface ProveTransactionProps {
  confirmTransaction: () => void;
  imageUrl: string;
  name: string;
  rejectTransaction: () => void;
  transactionData: string | null;
  url: string;
}

export const ProveTransaction = ({
  name,
  url,
  imageUrl,
  confirmTransaction,
  rejectTransaction,
  transactionData,
}: ProveTransactionProps) => {
  const { t } = useTranslation();
  return (
    <DappConnectorLayout
      title={t('dapp-connector.sign-transaction.title')}
      primaryButton={{
        label: t('dapp-connector.sign-transaction.sign'),
        action: confirmTransaction,
      }}
      secondaryButton={{
        label: t('dapp-connector.sign-transaction.deny'),
        action: rejectTransaction,
      }}>
      <DappInfo imageUrl={imageUrl} name={name} url={url} />
      <Box my="$16">
        <Text.Body.Normal data-testid="dapp-sign-description">
          {t('dapp-connector.sign-transaction.description')}
        </Text.Body.Normal>
      </Box>
      {transactionData && (
        <Box my="$8">
          <Text.Body.Small weight="$bold">
            {t('dapp-connector.sign-transaction.transaction-data')}
          </Text.Body.Small>
          <pre
            data-testid="dapp-transaction-data"
            style={{
              fontSize: '11px',
              maxHeight: '280px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              padding: '8px',
              borderRadius: '8px',
              margin: '8px 0 0 0',
            }}>
            {transactionData}
          </pre>
        </Box>
      )}
    </DappConnectorLayout>
  );
};
