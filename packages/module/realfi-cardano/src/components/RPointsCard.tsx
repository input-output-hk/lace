import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  Icon,
  Logos,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

const LOGO_SIZE = 48;
const LINK_ICON_SIZE = 24;
const INFO_ICON_SIZE = 16;

export type RPointsCardProps = {
  /** Locale-formatted points balance, e.g. "4,120". */
  points: string;
  /** Opens the "What are R-Points?" explainer sheet (the ℹ️ icon). */
  onInfoPress: () => void;
  /**
   * Opens the "R-Points by account" breakdown — a tap anywhere on the card
   * outside the ℹ️ / ↗ affordances (nested pressables claim their own taps).
   */
  onPress: () => void;
  /** Opens RealFi's rewards dashboard; the ↗ affordance hides when absent. */
  onOpenDashboard?: () => void;
  testID?: string;
};

/**
 * R-Points balance card on the USDr staking detail (LW-15495 AC2): logo,
 * label, the wallet's RealFi-reported balance, and an ↗ deep link out to
 * RealFi's rewards dashboard. Display-only — the balance is a cached API
 * value, never computed here.
 */
export const RPointsCard = ({
  points,
  onInfoPress,
  onPress,
  onOpenDashboard,
  testID = 'r-points-card',
}: RPointsCardProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Pressable style={styles.card} onPress={onPress} testID={testID}>
      <Row alignItems="center" gap={spacing.M}>
        <Logos.RPoints size={LOGO_SIZE} />
        <Column style={styles.text} gap={spacing.XS}>
          <Row alignItems="center" gap={spacing.XS}>
            <Text.M variant="secondary" testID={`${testID}-label`}>
              {t('realfi.season.r-points.label')}
            </Text.M>
            <Pressable
              onPress={onInfoPress}
              hitSlop={spacing.S}
              testID={`${testID}-info`}>
              <Icon
                name="InformationCircle"
                size={INFO_ICON_SIZE}
                color={theme.text.secondary}
              />
            </Pressable>
          </Row>
          <Text.L testID={`${testID}-balance`}>{points}</Text.L>
        </Column>
        {onOpenDashboard ? (
          <Pressable
            onPress={onOpenDashboard}
            hitSlop={spacing.S}
            testID={`${testID}-dashboard-link`}>
            <Icon
              name="ArrowUpRight"
              size={LINK_ICON_SIZE}
              color={theme.text.primary}
            />
          </Pressable>
        ) : null}
      </Row>
    </Pressable>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.M,
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowColor: theme.extra.shadowDrop,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
  });
