import {
  Button,
  Column,
  Icon,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

const BADGE_SIZE = 40;
const ICON_SIZE = 20;

export type RealFiBannerProps = {
  /** Badge icon; defaults to the gift/reward icon. */
  icon?: React.ComponentProps<typeof Icon>['name'];
  /** Heading, e.g. "Ready to withdraw" / "Cooling down". */
  title: string;
  /** Pre-formatted detail line, e.g. "+100.00 USDr" / "unlocks in 2d 3h". */
  subtitle: string;
  /**
   * Wrap cap for sentence-length subtitles (e.g. the feed-mismatch warning);
   * the default single line suits the amount/countdown banners.
   */
  subtitleLines?: number;
  /** Optional CTA pill; omit for an informational banner (e.g. cooldown). */
  cta?: { label: string; onPress: () => void };
  testID?: string;
};

/**
 * Accent-bordered banner: an icon badge + title/subtitle and an optional accent
 * CTA pill. Theme-aware — all colours come from theme tokens so it renders
 * correctly in both light and dark mode. Used for the withdraw-ready (with CTA)
 * and cooldown (informational) banners on the USDr staking page.
 */
export const RealFiBanner = ({
  icon = 'Gift',
  title,
  subtitle,
  subtitleLines = 1,
  cta,
  testID = 'realfi-banner',
}: RealFiBannerProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.card} testID={testID}>
      <Row alignItems="center" gap={spacing.M}>
        <View style={styles.badge} testID={`${testID}-badge`}>
          <Icon name={icon} size={ICON_SIZE} color={theme.brand.white} />
        </View>
        <Column style={styles.text} gap={spacing.XS}>
          <Text.M weight="medium" numberOfLines={1} testID={`${testID}-title`}>
            {title}
          </Text.M>
          <Text.S variant="secondary" numberOfLines={subtitleLines}>
            {subtitle}
          </Text.S>
        </Column>
        {cta ? (
          <Button.Primary
            size="small"
            label={cta.label}
            onPress={cta.onPress}
            testID={`${testID}-cta`}
          />
        ) : null}
      </Row>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: theme.brand.ascending,
      borderRadius: radius.L,
      padding: spacing.M,
      backgroundColor: theme.background.primary,
    },
    badge: {
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: theme.brand.ascending,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
  });
