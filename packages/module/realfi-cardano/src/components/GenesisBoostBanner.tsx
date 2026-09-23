import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { isGenesisBoostActive } from '@lace-contract/realfi-staking';
import {
  Column,
  Row,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActiveRealFiConfig } from '../use-realfi-config';

import type { Theme } from '@lace-lib/ui-toolkit';

// Bare 'en' resolves to en-US ("Sep 27, 2026"); this copy is day-first
// ("27 Sep 2026") in every language, so English formats as en-GB.
const DATE_LOCALE_OVERRIDES: Record<string, string> = { en: 'en-GB' };

/**
 * The promotion's end date as the banner states it. Formatted in UTC, not the
 * device zone: `activeTo` is the single instant RealFi markets the promotion
 * to, so a wallet either side of the date line must not advertise a different
 * last day than the campaign does.
 */
const formatEndDate = (activeTo: string, language: string): string =>
  new Intl.DateTimeFormat(DATE_LOCALE_OVERRIDES[language] ?? language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(activeTo));

/**
 * Genesis Boost banner for the Staking Center hub (LW-15495 AC1): no link, no
 * live data. Self-gating — renders only inside the `genesisBoost` window from
 * the REALFI flag payload (checked per render, so it appears and disappears
 * with no release or manual toggle) and only where RealFi is available on the
 * active network. The promotion is scheduled separately from the launch
 * season, so this reads `genesisBoost`, never `launchSeason`.
 */
export const GenesisBoostBanner = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const config = useActiveRealFiConfig();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { trackEvent } = useAnalytics();

  const genesisBoost = config?.genesisBoost;
  const isActive = isGenesisBoostActive(genesisBoost, Date.now());
  // `isActive` guarantees a parseable `activeTo`, so the copy can never show
  // an "Invalid Date".
  const endDate = useMemo(
    () =>
      isActive && genesisBoost?.activeTo
        ? formatEndDate(genesisBoost.activeTo, i18n.language)
        : undefined,
    [isActive, genesisBoost?.activeTo, i18n.language],
  );
  // Impression, once per mount and only when the banner actually renders.
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (hasTrackedView.current || !isActive) return;
    hasTrackedView.current = true;
    trackEvent('realfi | genesis banner | viewed');
  }, [isActive, trackEvent]);

  if (!isActive) return null;

  return (
    <View style={styles.card} testID="genesis-boost-banner">
      <Row alignItems="center" gap={spacing.M}>
        <Text.L>⚡</Text.L>
        <Column style={styles.text}>
          <Text.M weight="bold" style={styles.copy}>
            {t('realfi.season.genesis-boost.title')}
          </Text.M>
          <Text.M style={styles.copy}>
            {t('realfi.season.genesis-boost.subtitle', { date: endDate })}
          </Text.M>
        </Column>
      </Row>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.M,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.L,
      backgroundColor: theme.brand.ascending,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    copy: {
      color: theme.brand.white,
    },
  });
