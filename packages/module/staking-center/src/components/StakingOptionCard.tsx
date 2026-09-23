import {
  Card,
  Column,
  Icon,
  Row,
  Text,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

export type StakingOptionCardProps = {
  /** Brand/blockchain logo node, e.g. <Logos.Usdr /> or <Blockchains.Cardano />. */
  icon: React.ReactNode;
  title: string;
  balanceLabel: string;
  balanceValue: string;
  /** Optional smaller unit rendered next to the balance (e.g. "ADA"). */
  balanceUnit?: string;
  yieldLabel: string;
  /** Absent while the live rate is still loading — renders an em dash. */
  yieldValue?: string;
  onPress: () => void;
  testID?: string;
};

/**
 * Compact staking-option card for the Staking Center hub: a logo + title header
 * with a drill-in chevron, over a two-column Total Balance / Yield summary. Tap
 * anywhere to open that option's detail. Presentational — values via props.
 */
export const StakingOptionCard = ({
  icon,
  title,
  balanceLabel,
  balanceValue,
  balanceUnit,
  yieldLabel,
  yieldValue,
  onPress,
  testID,
}: StakingOptionCardProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Pressable onPress={onPress} testID={testID}>
      <Card cardStyle={styles.card}>
        <Column gap={spacing.M}>
          <Row alignItems="center" justifyContent="space-between">
            <Row alignItems="center" gap={spacing.S}>
              {icon}
              <Text.M>{title}</Text.M>
            </Row>
            <Icon name="CaretRight" size={20} color={theme.text.secondary} />
          </Row>

          <Row>
            <Column style={styles.statColumn} gap={spacing.XS}>
              <Text.XS variant="secondary">{balanceLabel}</Text.XS>
              <Row alignItems="baseline" gap={spacing.XS}>
                <Text.M>{balanceValue}</Text.M>
                {balanceUnit ? (
                  <Text.XS variant="secondary">{balanceUnit}</Text.XS>
                ) : null}
              </Row>
            </Column>
            <Column style={styles.statColumn} gap={spacing.XS}>
              <Text.XS variant="secondary">{yieldLabel}</Text.XS>
              <Text.M style={styles.yield}>{yieldValue ?? '—'}</Text.M>
            </Column>
          </Row>
        </Column>
      </Card>
    </Pressable>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: spacing.L,
      gap: spacing.M,
    },
    statColumn: {
      flex: 1,
    },
    yield: {
      color: theme.data.positive,
    },
  });
