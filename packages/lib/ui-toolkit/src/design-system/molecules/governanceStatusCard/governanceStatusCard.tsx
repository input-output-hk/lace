import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getShadowStyle,
  radius,
  spacing,
  useTheme,
} from '../../../design-tokens';
import { Card, Column, Row, Text } from '../../atoms';

import type { Theme } from '../../../design-tokens';

export type GovernanceStatusCardProps = {
  delegatedCount: number;
  totalAccountsCount: number;
  testID?: string;
};

export const GovernanceStatusCard = ({
  delegatedCount,
  totalAccountsCount,
  testID = 'governance-status-card',
}: GovernanceStatusCardProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const progressBarStyle = useMemo(
    (): { width: `${number}%` } => ({
      width:
        totalAccountsCount > 0
          ? `${(delegatedCount / totalAccountsCount) * 100}%`
          : '0%',
    }),
    [delegatedCount, totalAccountsCount],
  );

  const delegatedCountColor =
    delegatedCount === 0
      ? theme.text.primary
      : delegatedCount === totalAccountsCount
      ? theme.data.positive
      : theme.brand.yellow;

  return (
    <Card cardStyle={styles.card} testID={testID}>
      <Column gap={spacing.XS}>
        <Text.XS variant="secondary" testID={`${testID}-label`}>
          {t('v2.governance.status-card.delegated')}
        </Text.XS>
        <Row alignItems="center" gap={spacing.XS}>
          <Text.XL
            style={[styles.delegatedCount, { color: delegatedCountColor }]}
            testID={`${testID}-delegated-count`}>
            {delegatedCount}
          </Text.XL>
          <Text.XS variant="secondary" testID={`${testID}-total-label`}>
            {t('v2.governance.status-card.delegated-of-total', {
              total: totalAccountsCount,
            })}
          </Text.XS>
        </Row>
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, progressBarStyle]}
            testID={`${testID}-progress-bar`}
          />
        </View>
      </Column>
    </Card>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background.primary,
      padding: spacing.L,
      gap: spacing.M,
      borderRadius: radius.M,
      borderWidth: 0.5,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      borderLeftColor: theme.border.middle,
      borderRightColor: theme.border.middle,
      overflow: 'visible',
      ...getShadowStyle({ theme, variant: 'card' }),
    },
    delegatedCount: {},
    progressBarContainer: {
      height: 4,
      backgroundColor: theme.background.tertiary,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.data.positive,
      borderRadius: 2,
    },
  });
