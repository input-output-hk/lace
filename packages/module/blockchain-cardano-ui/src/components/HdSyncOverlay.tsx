import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  Loader,
  SheetSafeOverlay,
  Text,
  backdropStyle,
  getShadowStyle,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useRef } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { LayoutSize, Theme } from '@lace-lib/ui-toolkit';

const TEST_ID_PREFIX = 'address-discovery-warning-modal';

/**
 * Renders a blocking overlay while a user-triggered (thorough) HD address
 * discovery is running for ANY Cardano account, and dispatches a
 * success/error toast on completion.
 *
 * Not scoped to an "active" account: the row that triggers manual sync is
 * mounted on the account-details page, which is bound to URL params rather
 * than the active-account context, so the user can trigger a sync from a
 * non-active account. The overlay follows whichever account currently has
 * a thorough op in `pendingSync` (slice selector
 * `selectAccountIdInManualHdSync`).
 *
 * Why this doesn't use `Modal` from `@lace-lib/ui-toolkit`:
 * - `Modal` requires `RequireAtLeastOne<{ onClose, onConfirm }>` and renders
 *   a close X whenever `onClose` is truthy and a confirm button whenever
 *   `onConfirm` is truthy. We need neither — the overlay must be entirely
 *   non-cancellable while the scan runs. `SheetSafeOverlay` is the same
 *   platform-aware primitive `Modal` uses; we wrap it with a custom card.
 *
 * Closability is suppressed at multiple layers:
 * - No X-button (we don't render one).
 * - No backdrop tap handler (the overlay View is non-pressable).
 * - Android hardware back: `SheetSafeOverlay`'s `onRequestClose` is omitted
 *   (RN's native modal stays visible until parent toggles `visible`), and
 *   we additionally intercept `hardwareBackPress` while in-flight so other
 *   listeners can't react either.
 *
 * Outcome is captured from the (still-pending) sync op's terminal status on
 * the `isInProgress` falling edge — the sync slice clears `pendingSync`
 * shortly after the round completes, so the snapshot must happen at the
 * transition moment. The parent selector intentionally keeps returning the
 * accountId while the thorough op sits in `pendingSync` in a terminal
 * state, so the child stays mounted long enough for the toast effect.
 */
export const HdSyncOverlay = () => {
  const accountId = useLaceSelector(
    'cardanoContext.selectAccountIdInManualHdSync',
  );
  if (!accountId) return null;
  return <HdSyncOverlayForAccount accountId={accountId} />;
};

const HdSyncOverlayForAccount = ({ accountId }: { accountId: AccountId }) => {
  const { t } = useTranslation();
  const { theme, layoutSize } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, layoutSize),
    [theme, layoutSize],
  );
  const showToast = useDispatchLaceAction('ui.showToast');
  const { trackEvent } = useAnalytics();
  const isInProgress = useLaceSelector(
    'cardanoContext.selectIsManualHdSyncInProgress',
    accountId,
  );
  const terminalStatus = useLaceSelector(
    'cardanoContext.selectManualHdSyncTerminalStatus',
    accountId,
  );

  // Suppress Android hardware back while the overlay is visible. Returns
  // true from the listener to consume the event so other registered
  // hardwareBackPress listeners (e.g. router) don't see it either.
  useEffect(() => {
    if (!isInProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      sub.remove();
    };
  }, [isInProgress]);

  // Edge-triggered outcome detection. Captures the terminal status while it's
  // still observable on the operation, before pendingSync clears.
  //
  // Effect ordering matters and depends on React's documented top-down
  // execution: the `terminalStatus` effect MUST be declared before the
  // `isInProgress` falling-edge effect. When the sync round completes, both
  // values can transition in the same render (terminalStatus → 'Completed',
  // then isInProgress → false). React runs effects in declaration order, so
  // the first effect records the status into `lastTerminalStatusRef` before
  // the second effect reads it. Reversing the order would read a stale
  // (undefined) ref and silently drop the toast.
  const wasInProgressRef = useRef(false);
  const lastTerminalStatusRef = useRef<'Completed' | 'Failed' | undefined>(
    undefined,
  );
  useEffect(() => {
    if (terminalStatus === 'Completed' || terminalStatus === 'Failed') {
      lastTerminalStatusRef.current = terminalStatus;
    }
  }, [terminalStatus]);
  useEffect(() => {
    if (wasInProgressRef.current && !isInProgress) {
      const captured = lastTerminalStatusRef.current;
      if (captured === 'Completed') {
        showToast({
          text: t('v2.account-settings.hd-wallet-sync.toast.success'),
          color: 'positive',
          leftIcon: { name: 'Refresh' },
        });
        trackEvent('settings | wallet | hd wallet sync | sync | success');
      } else if (captured === 'Failed') {
        showToast({
          text: t('v2.account-settings.hd-wallet-sync.toast.error'),
          color: 'negative',
          leftIcon: { name: 'Warning' },
        });
      }
      lastTerminalStatusRef.current = undefined;
    }
    wasInProgressRef.current = isInProgress;
  }, [isInProgress, showToast, t, trackEvent]);

  if (!isInProgress) return null;
  return (
    <SheetSafeOverlay>
      <View style={styles.overlay} testID={`${TEST_ID_PREFIX}-overlay`}>
        <View style={styles.card} testID={`${TEST_ID_PREFIX}-component`}>
          <Text.M align="center" testID={`${TEST_ID_PREFIX}-title-text`}>
            {t('v2.account-settings.hd-wallet-sync.modal.title')}
          </Text.M>
          <Loader size={32} testID={`${TEST_ID_PREFIX}-loader`} />
        </View>
      </View>
    </SheetSafeOverlay>
  );
};

const getCardMaxWidth = (layoutSize: LayoutSize) => {
  if (layoutSize === 'compact') return '80%';
  if (layoutSize === 'medium') return '50%';
  return '33%';
};

const getStyles = (theme: Theme, layoutSize: LayoutSize) =>
  StyleSheet.create({
    overlay: {
      ...backdropStyle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      maxWidth: getCardMaxWidth(layoutSize),
      padding: spacing.M,
      borderRadius: radius.M,
      alignItems: 'center',
      backgroundColor: theme.background.page,
      gap: spacing.L,
      ...getShadowStyle({ theme, variant: 'overlay' }),
    },
  });
