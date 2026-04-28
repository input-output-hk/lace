import type { CSSProperties } from 'react';

import { Box, Text, useTheme } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { DappInfoCard } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

export interface ProveTransactionV2Props {
  confirmTransaction: () => void;
  imageUrl: string;
  name: string;
  rejectTransaction: () => void;
  transactionData: string | null;
  url: string;
}

export const ProveTransactionV2 = ({
  name,
  url,
  imageUrl,
  confirmTransaction,
  rejectTransaction,
  transactionData,
}: ProveTransactionV2Props) => {
  const { t } = useTranslation();
  const { vars } = useTheme();

  const preStyle: CSSProperties = useMemo(
    () => ({
      fontSize: '11px',
      maxHeight: '280px',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      backgroundColor: vars.colors.$card_elevated_backgroundColor,
      color: vars.colors.$text_primary,
      padding: '8px',
      borderRadius: '8px',
      margin: '8px 0 0 0',
    }),
    [vars],
  );

  return (
    <DappConnectorLayoutV2
      primaryButton={{
        label: t('dapp-connector.sign-transaction.sign'),
        action: confirmTransaction,
      }}
      secondaryButton={{
        label: t('dapp-connector.sign-transaction.deny'),
        action: rejectTransaction,
      }}>
      <Box mb="$16">
        <Text.Body.Large weight="$bold">
          {t('dapp-connector.sign-transaction.title')}
        </Text.Body.Large>
      </Box>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
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
          <pre data-testid="dapp-transaction-data" style={preStyle}>
            {transactionData}
          </pre>
        </Box>
      )}
    </DappConnectorLayoutV2>
  );
};
