import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayout } from '@lace-lib/ui-extension';
import {
  DappInfoCard,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export interface ProveTransactionProps {
  confirmTransaction: () => void;
  imageUrl: string;
  name: string;
  rejectTransaction: () => void;
  transactionData: string | null;
  url: string;
}

const PRE_MAX_HEIGHT = 280;

const styles = StyleSheet.create({
  section: { marginVertical: spacing.M },
  smallSection: { marginVertical: spacing.S },
  preContainer: {
    maxHeight: PRE_MAX_HEIGHT,
    padding: spacing.S,
    marginTop: spacing.S,
    borderRadius: radius.XS,
  },
});

export const ProveTransaction = ({
  name,
  url,
  imageUrl,
  confirmTransaction,
  rejectTransaction,
  transactionData,
}: ProveTransactionProps) => {
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
    </DappConnectorLayout>
  );
};
