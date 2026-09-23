import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  Icon,
  Row,
  Sheet,
  Text,
  openUrl,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useActiveRealFiConfig } from '../use-realfi-config';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

const EMOJI_TILE_SIZE = 30;
const CARET_ICON_SIZE = 16;

const ExplainerSection = ({
  emoji,
  title,
  body,
  testID,
}: {
  emoji: string;
  title: string;
  body: string;
  testID: string;
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.sectionCard} testID={testID}>
      <Row alignItems="center" gap={spacing.M}>
        <View style={styles.emojiTile}>
          <Text.M>{emoji}</Text.M>
        </View>
        <Column style={styles.sectionText} gap={spacing.XS}>
          <Text.M variant="secondary">{title}</Text.M>
          <Text.M>{body}</Text.M>
        </Column>
      </Row>
    </View>
  );
};

/**
 * "What are R-Points?" explainer sheet (LW-15495 AC3), opened from the ℹ️ on
 * the R-Points card. Qualitative copy only — no rates, multiplier values, or
 * dates live here, so the sheet never goes stale against RealFi's season
 * mechanics. "More details" deep-links to RealFi's points program page and
 * hides until the CMS payload supplies that URL.
 */
export const RealFiRPointsExplainer = (
  props: SheetScreenProps<SheetRoutes.RealFiRPointsExplainer>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themedStyles = useMemo(() => getStyles(theme), [theme]);
  const config = useActiveRealFiConfig();
  const pointsProgramUrl = config?.launchSeason?.pointsProgramUrl;
  const { trackEvent } = useAnalytics();

  // The sheet mounts fresh per info-icon tap, so mount = one open.
  useEffect(() => {
    trackEvent('realfi | explainer | opened');
  }, [trackEvent]);

  const onGotIt = useCallback(() => {
    NavigationControls.closeSheet();
  }, []);

  const onByAccount = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.RealFiRPointsByAccount);
  }, []);

  const onMoreDetails = useMemo(() => {
    if (!pointsProgramUrl) return undefined;
    return () => {
      trackEvent('realfi | explainer | more details clicked');
      void openUrl({
        url: pointsProgramUrl,
        onError: () => {
          // Error handling is done in the openUrl utility.
        },
      });
    };
  }, [pointsProgramUrl, trackEvent]);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.season.explainer.title')}
          testID="r-points-explainer-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={
            onMoreDetails
              ? {
                  label: t('realfi.season.explainer.more-details'),
                  onPress: onMoreDetails,
                  testID: 'r-points-explainer-more-details',
                }
              : undefined
          }
          primaryButton={{
            label: t('realfi.season.explainer.got-it'),
            onPress: onGotIt,
            testID: 'r-points-explainer-got-it',
          }}
        />
      ),
    });
  }, [navigation, t, onGotIt, onMoreDetails]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContent}>
      <Column gap={spacing.L}>
        <Text.S align="center" testID="r-points-explainer-lead">
          {t('realfi.season.explainer.lead')}
        </Text.S>
        <ExplainerSection
          emoji="💰"
          title={t('realfi.season.explainer.work.title')}
          body={t('realfi.season.explainer.work.body')}
          testID="r-points-explainer-work"
        />
        <ExplainerSection
          emoji="⚡"
          title={t('realfi.season.explainer.early.title')}
          body={t('realfi.season.explainer.early.body')}
          testID="r-points-explainer-early"
        />
        <ExplainerSection
          emoji="🎁"
          title={t('realfi.season.explainer.launch.title')}
          body={t('realfi.season.explainer.launch.body')}
          testID="r-points-explainer-launch"
        />
        <Pressable
          style={themedStyles.sectionCard}
          onPress={onByAccount}
          testID="r-points-explainer-by-account">
          <Row alignItems="center" gap={spacing.M}>
            <Text.M style={themedStyles.sectionText}>
              {t('realfi.season.by-account.title')}
            </Text.M>
            <Icon
              name="CaretRight"
              size={CARET_ICON_SIZE}
              color={theme.text.secondary}
            />
          </Row>
        </Pressable>
        <Text.S variant="tertiary" testID="r-points-explainer-disclaimer">
          {t('realfi.season.explainer.disclaimer')}
        </Text.S>
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.L,
  },
});

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionCard: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      padding: spacing.M,
    },
    emojiTile: {
      width: EMOJI_TILE_SIZE,
      height: EMOJI_TILE_SIZE,
      borderRadius: radius.XS / 2,
      backgroundColor: theme.brand.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionText: {
      flex: 1,
      minWidth: 0,
    },
  });
