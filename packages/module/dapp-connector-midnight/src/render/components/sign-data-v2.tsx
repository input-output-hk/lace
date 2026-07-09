import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import {
  DappInfoCard,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export interface SignDataV2Props {
  confirmSignData: () => void;
  imageUrl: string;
  keyType: string;
  name: string;
  payload: string;
  rejectSignData: () => void;
  url: string;
}

const PRE_MAX_HEIGHT = 280;

const styles = StyleSheet.create({
  titleContainer: { marginBottom: spacing.M },
  section: { marginVertical: spacing.M },
  smallSection: { marginVertical: spacing.S },
  preContainer: {
    maxHeight: PRE_MAX_HEIGHT,
    padding: spacing.S,
    marginTop: spacing.S,
    borderRadius: radius.XS,
  },
});

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
  const { theme } = useTheme();

  const preContainerStyle = useMemo(
    () => [
      styles.preContainer,
      { backgroundColor: theme.background.secondary },
    ],
    [theme],
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
      <View style={styles.titleContainer}>
        <Text.M>{t('dapp-connector.sign-data.title')}</Text.M>
      </View>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <View style={styles.section}>
        <Text.S testID="dapp-sign-data-description">
          {t('dapp-connector.sign-data.description')}
        </Text.S>
      </View>
      <View style={styles.smallSection}>
        <Text.XS>{t('dapp-connector.sign-data.key-type')}</Text.XS>
        <Text.XS testID="dapp-sign-data-key-type">{keyType}</Text.XS>
      </View>
      <View style={styles.smallSection}>
        <Text.XS>{t('dapp-connector.sign-data.payload')}</Text.XS>
        <ScrollView
          style={preContainerStyle}
          nestedScrollEnabled
          testID="dapp-sign-data-payload">
          <Text.XS>{payload}</Text.XS>
        </ScrollView>
      </View>
    </DappConnectorLayoutV2>
  );
};
