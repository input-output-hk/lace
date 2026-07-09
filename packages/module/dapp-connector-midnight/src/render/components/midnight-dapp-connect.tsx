import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import {
  Column,
  DappInfoCard,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
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
  titleContainer: { width: '100%', marginBottom: spacing.M },
  infoBar: {
    padding: spacing.S,
    borderRadius: radius.XS,
    marginBottom: spacing.M,
  },
  section: { marginVertical: spacing.M },
});

const PERMISSION_KEYS = [
  'dapp-connector.connect-dapp.description1',
  'dapp-connector.connect-dapp.description2',
  'dapp-connector.connect-dapp.description3',
] as const;

export const MidnightDappConnect = ({
  onAuthorize,
  onCancel,
  imageUrl,
  name,
  url,
}: MidnightDappConnectProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const infoBarStyle = useMemo(
    () => [styles.infoBar, { backgroundColor: theme.background.secondary }],
    [theme],
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
        <Text.M>{t('dapp-connector.connect-dapp.title')}</Text.M>
      </View>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <Row
        alignItems="flex-start"
        gap={spacing.S}
        style={infoBarStyle}
        testID="midnight-dapp-connector-info-bar">
        <ShieldExclamation />
        <Text.S>{t('dapp-connector.connect-dapp.info')}</Text.S>
      </Row>
      <View style={styles.section}>
        <Text.M testID="midnight-dapp-connect-description-heading">
          {t('dapp-connector.connect-dapp.description-heading')}
        </Text.M>
      </View>
      <Column gap={spacing.S} testID="midnight-dapp-connect-description-list">
        {PERMISSION_KEYS.map((key, index) => (
          <Row
            key={key}
            alignItems="flex-start"
            gap={spacing.S}
            testID={`midnight-dapp-connect-permission-${index + 1}`}>
            <Text.S>{'\u2022'}</Text.S>
            <Text.S>{t(key)}</Text.S>
          </Row>
        ))}
      </Column>
    </DappConnectorLayoutV2>
  );
};
