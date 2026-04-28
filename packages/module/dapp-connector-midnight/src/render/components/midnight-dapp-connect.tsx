import type { CSSProperties } from 'react';

import { Box, InfoBar, Text, useTheme } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { DappInfoCard } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import ShieldExclamation from '../assets/icons/shield-exclamation.component.svg';

export interface MidnightDappConnectProps {
  onAuthorize: () => void;
  onCancel: () => void;
  imageUrl?: string;
  name: string;
  url: string;
}

const styles = StyleSheet.create({
  titleContainer: {
    width: '100%',
    marginBottom: 16,
  },
});

export const MidnightDappConnect = ({
  onAuthorize,
  onCancel,
  imageUrl,
  name,
  url,
}: MidnightDappConnectProps) => {
  const { t } = useTranslation();
  const { vars } = useTheme();

  const listStyle: CSSProperties = useMemo(
    () => ({
      color: vars.colors.$text_primary,
      paddingLeft: 20,
      margin: 0,
    }),
    [vars],
  );

  return (
    <DappConnectorLayoutV2
      primaryButton={{
        label: t('dapp-connector.connect-dapp.authorize'),
        action: onAuthorize,
      }}
      secondaryButton={{
        label: t('dapp-connector.connect-dapp.cancel'),
        action: onCancel,
      }}>
      <View style={styles.titleContainer}>
        <Text.Body.Large weight="$bold">
          {t('dapp-connector.connect-dapp.title')}
        </Text.Body.Large>
      </View>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <InfoBar
        message={t('dapp-connector.connect-dapp.info')}
        icon={<ShieldExclamation />}
        testId="midnight-dapp-connector-info-bar"
      />
      <Box my="$16">
        <Text.Body.Large
          weight="$bold"
          data-testid="midnight-dapp-connect-description-heading">
          {t('dapp-connector.connect-dapp.description-heading')}
        </Text.Body.Large>
      </Box>
      <ul
        data-testid="midnight-dapp-connect-description-list"
        style={listStyle}>
        <li data-testid="midnight-dapp-connect-permission-1">
          {t('dapp-connector.connect-dapp.description1')}
        </li>
        <li data-testid="midnight-dapp-connect-permission-2">
          {t('dapp-connector.connect-dapp.description2')}
        </li>
        <li data-testid="midnight-dapp-connect-permission-3">
          {t('dapp-connector.connect-dapp.description3')}
        </li>
      </ul>
    </DappConnectorLayoutV2>
  );
};
