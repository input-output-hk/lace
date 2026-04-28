import { useTranslation } from '@lace-contract/i18n';
import { Column, Sheet, spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

/**
 * The KYC webview page
 */
export const ConnectionDetailsPage = () => {
  const styles = useMemo(() => getStyles(), []);
  const { t } = useTranslation();
  return (
    <Sheet.Scroll>
      <Column
        justifyContent="center"
        alignItems="center"
        style={styles.content}>
        <Text.XL align="center">
          {t('v2.identity.page.connectionDetails')}
        </Text.XL>
      </Column>
    </Sheet.Scroll>
  );
};

const getStyles = () =>
  StyleSheet.create({
    content: {
      height: 400,
      padding: spacing.M,
    },
  });
