import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { isLaunchSeasonActive } from '@lace-contract/realfi-staking';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  Icon,
  Logos,
  Row,
  Sheet,
  Text,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLaceSelector, useDispatchLaceAction } from '../hooks';
import { isUsdrTokenId } from '../realfi-config';
import { useActiveRealFiConfig } from '../use-realfi-config';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

const RESULT_ICON_SIZE = 48;
const BONUS_LOGO_SIZE = 28;

/**
 * Post-sign in-sheet confirmation (M3, LW-14681 / A2). Mirrors the send-flow
 * result screen — centered icon + message, single Done CTA. The sheet stays
 * open after signing to confirm success: staking receives sUSDr shortly.
 * Done resets the flow and closes the sheet.
 */
export const RealFiAddedToQueue = (
  props: SheetScreenProps<SheetRoutes.RealFiAddedToQueue>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const reset = useDispatchLaceAction('realfiFlow.reset');

  const flowState = useLaceSelector('realfiFlow.selectFlowState');
  const kind = flowState.status === 'Queued' ? flowState.kind : undefined;
  const queuedAccountId =
    flowState.status === 'Queued' ? flowState.accountId : undefined;
  const description =
    kind === 'unstake'
      ? t('realfi.queue.description-unstake')
      : t('realfi.queue.description-stake');

  // Bonus confirmation pill (LW-15495 AC5): only the account's FIRST swap into
  // USDr via Lace qualifies — availability derives from RealFi's own order
  // history + the local consumed flag (the SDK exposes no bonus-used read).
  // The swap-vs-direct-stake split reads the token the QUEUED transaction was
  // actually funded with, not the Manage sheet's selection: that selection is
  // optional, never cleared, and defaulted to ADA here, which read a
  // USDr-funded stake as a swap and both showed the pill and burned the
  // one-time bonus flag. Captured once on mount: the effect below
  // marks the bonus consumed (so a second swap never shows first-swap
  // messaging), which must not hide this pill mid-view.
  const realfiConfig = useActiveRealFiConfig();
  const queuedInputTokenId =
    flowState.status === 'Queued' ? flowState.inputTokenId : undefined;
  const isBonusAvailable = useLaceSelector(
    'realfiPosition.selectIsLaceSwapBonusAvailableByAccountId',
    queuedAccountId ?? AccountId(''),
  );
  const [shouldShowBonusPill] = useState(
    () =>
      kind === 'stake' &&
      isBonusAvailable &&
      realfiConfig !== undefined &&
      // Windowed: the season has its own activeFrom/activeTo, and a CMS kill
      // switch delivers `launchSeason: null`.
      isLaunchSeasonActive(realfiConfig.launchSeason, Date.now()) &&
      // Fails closed on an unknown funding token: no pill, no consumed flag.
      queuedInputTokenId !== undefined &&
      !isUsdrTokenId(queuedInputTokenId, realfiConfig.usdrTokenId),
  );
  const consumeBonus = useDispatchLaceAction(
    'realfiPosition.laceSwapBonusConsumed',
  );
  useEffect(() => {
    if (shouldShowBonusPill && queuedAccountId) {
      consumeBonus({ accountId: queuedAccountId });
    }
  }, [shouldShowBonusPill, queuedAccountId, consumeBonus]);
  const { trackEvent } = useAnalytics();
  useEffect(() => {
    // shouldShowBonusPill is captured once on mount, so this fires at most
    // once per queue confirmation.
    if (shouldShowBonusPill) trackEvent('realfi | bonus earned | viewed');
  }, [shouldShowBonusPill, trackEvent]);

  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const onDone = useCallback(() => {
    reset();
    NavigationControls.closeSheet();
  }, [reset]);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.queue.title')}
          testID="realfi-queue-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.queue.done'),
            onPress: onDone,
            testID: 'realfi-queue-done-button',
          }}
        />
      ),
    });
  }, [navigation, t, onDone]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContent}>
      <Column
        gap={spacing.M}
        alignItems="center"
        justifyContent="center"
        style={styles.content}>
        <Icon name="Clock" size={RESULT_ICON_SIZE} testID="realfi-queue-icon" />
        <Text.M align="center" testID="realfi-queue-description">
          {description}
        </Text.M>
        {shouldShowBonusPill && (
          <View style={styles.bonusPill} testID="realfi-queue-bonus-pill">
            <Row alignItems="center" gap={spacing.M}>
              <Logos.RPoints size={BONUS_LOGO_SIZE} />
              <Text.S weight="bold">{t('realfi.season.bonus-earned')}</Text.S>
            </Row>
          </View>
        )}
      </Column>
    </Sheet.Scroll>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    // flexGrow lets the short content centre in the sheet's full height, both
    // horizontally and vertically, while still scrolling if it ever overflows.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: spacing.M,
    },
    bonusPill: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.S,
      marginTop: spacing.M,
    },
  });
