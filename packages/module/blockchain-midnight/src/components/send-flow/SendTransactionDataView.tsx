import { useTranslation } from '@lace-contract/i18n';
import { Icon, radius, spacing, Text, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const DATA_MAX_HEIGHT = 280;

const styles = StyleSheet.create({
  container: { marginVertical: spacing.S },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataContainer: {
    maxHeight: DATA_MAX_HEIGHT,
    padding: spacing.S,
    marginTop: spacing.S,
    borderRadius: radius.XS,
  },
});

/**
 * The rendering half, split from the store read so it can be driven directly
 * from props — matching DustDesignationForm, and the only way this surface is
 * reachable from Storybook (blockchain-midnight is not loaded by the mobile app,
 * so a story cannot bootstrap the module loader to satisfy useLaceSelector).
 */
export const SendTransactionDataView = ({
  transactionData,
}: {
  transactionData: string | null;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(previous => !previous);
  }, []);

  const dataContainerStyle = useMemo(
    () => [
      styles.dataContainer,
      { backgroundColor: theme.background.secondary },
    ],
    [theme],
  );

  if (!transactionData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        style={styles.toggleRow}
        onPress={toggleExpanded}
        testID="send-form-transaction-data-toggle">
        <Text.XS variant="secondary">
          {t('midnight.send-flow.form.transaction-data')}
        </Text.XS>
        <Icon name={isExpanded ? 'ArrowUp' : 'ArrowDown'} size={16} />
      </Pressable>
      {isExpanded && (
        <ScrollView
          style={dataContainerStyle}
          nestedScrollEnabled
          testID="send-form-transaction-data">
          <Text.XS>{transactionData}</Text.XS>
        </ScrollView>
      )}
    </View>
  );
};
