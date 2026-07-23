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

export interface ProveTransactionV2Props {
  confirmTransaction: () => void;
  imageUrl: string;
  name: string;
  rejectTransaction: () => void;
  transactionData: string | null;
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

export const ProveTransactionV2 = ({
  name,
  url,
  imageUrl,
  confirmTransaction,
  rejectTransaction,
  transactionData,
}: ProveTransactionV2Props) => {
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
      fillViewport
      primaryButton={{
        label: t('dapp-connector.sign-transaction.sign'),
        action: confirmTransaction,
      }}
      secondaryButton={{
        label: t('dapp-connector.sign-transaction.deny'),
        action: rejectTransaction,
      }}>
      <View style={styles.titleContainer}>
        <Text.M>{t('dapp-connector.sign-transaction.title')}</Text.M>
      </View>
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <View style={styles.section}>
        <Text.S testID="dapp-sign-description">
          {t('dapp-connector.sign-transaction.description')}
        </Text.S>
      </View>
      {transactionData && (
        <View style={styles.smallSection}>
          <Text.XS>
            {t('dapp-connector.sign-transaction.transaction-data')}
          </Text.XS>
          <ScrollView
            style={preContainerStyle}
            nestedScrollEnabled
            testID="dapp-transaction-data">
            <Text.XS>{transactionData}</Text.XS>
          </ScrollView>
        </View>
      )}
    </DappConnectorLayoutV2>
  );
};
