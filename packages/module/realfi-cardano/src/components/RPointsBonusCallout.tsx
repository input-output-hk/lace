import { useTranslation } from '@lace-contract/i18n';
import {
  Logos,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@lace-lib/ui-toolkit';

const LOGO_SIZE = 48;

/**
 * One-time Lace acquisition bonus callout (LW-15495 AC4), shown above the CTA
 * in flows whose transaction swaps into USDr. Static copy — eligibility (the
 * bonus attaches to the swap, never to staking already-held USDr) is decided
 * by the caller from RealFi's bonus-used flag and the selected input token.
 */
export const RPointsBonusCallout = ({
  testID = 'r-points-bonus-callout',
}: {
  testID?: string;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.card} testID={testID}>
      <Row alignItems="center" gap={spacing.M}>
        <Logos.RPoints size={LOGO_SIZE} />
        <Text.S variant="secondary" style={styles.text}>
          <Text.S weight="bold">
            {t('realfi.season.bonus-callout.title')}
          </Text.S>{' '}
          {t('realfi.season.bonus-callout.body')}
        </Text.S>
      </Row>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.M,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
  });
