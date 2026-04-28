import type { CSSProperties } from 'react';

import { Box, Text, useTheme } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { DappInfoCard } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

export interface SignDataV2Props {
  confirmSignData: () => void;
  imageUrl: string;
  keyType: string;
  name: string;
  payload: string;
  rejectSignData: () => void;
  url: string;
}

export const SignDataV2 = ({
  name,
  url,
  imageUrl,
  confirmSignData,
  rejectSignData,
  payload,
  keyType,
}: SignDataV2Props) => {
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
        label: t('dapp-connector.sign-data.sign'),
        action: confirmSignData,
      }}
      secondaryButton={{
        label: t('dapp-connector.sign-data.deny'),
        action: rejectSignData,
      }}>
      <Box mb="$16">
        <Text.Body.Large weight="$bold">
          {t('dapp-connector.sign-data.title')}
        </Text.Body.Large>
      </Box>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <Box my="$16">
        <Text.Body.Normal data-testid="dapp-sign-data-description">
          {t('dapp-connector.sign-data.description')}
        </Text.Body.Normal>
      </Box>
      <Box my="$8">
        <Text.Body.Small weight="$bold">
          {t('dapp-connector.sign-data.key-type')}
        </Text.Body.Small>
        <Text.Body.Small data-testid="dapp-sign-data-key-type">
          {keyType}
        </Text.Body.Small>
      </Box>
      <Box my="$8">
        <Text.Body.Small weight="$bold">
          {t('dapp-connector.sign-data.payload')}
        </Text.Body.Small>
        <pre data-testid="dapp-sign-data-payload" style={preStyle}>
          {payload}
        </pre>
      </Box>
    </DappConnectorLayoutV2>
  );
};
