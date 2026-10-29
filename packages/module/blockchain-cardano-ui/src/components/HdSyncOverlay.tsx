import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  Loader,
  Button,
  ProgressBar,
  SheetSafeOverlay,
  Text,
  backdropStyle,
  getShadowStyle,
  radius,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { LayoutSize, Theme } from '@lace-lib/ui-toolkit';

const TEST_ID_PREFIX = 'address-discovery-warning-modal';

/**
 * Renders a blocking overlay while user-triggered HD address discovery or a
 * wallet reset is running for any Cardano account, retaining reset failures
 * with Retry and Close after the attempt releases its sync round.
 *
 * Not scoped to an "active" account: the row that triggers manual sync is
 * mounted on the account-details page, which is bound to URL params rather
 * than the active-account context, so the user can trigger a sync from a
 * non-active account. The overlay follows whichever account currently has
 * a manual sync in progress, or a retained reset failure.
 *
 * Why this doesn't use `Modal` from `@lace-lib/ui-toolkit`:
 * - `Modal` requires `RequireAtLeastOne<{ onClose, onConfirm }>` and renders
 *   a close X whenever `onClose` is truthy and a confirm button whenever
 *   `onConfirm` is truthy. We need neither while an attempt runs: it must
 *   remain non-cancellable. `SheetSafeOverlay` is the same platform-aware
 *   primitive `Modal` uses; we wrap it with a custom card.
 *
 * Active attempts have no close button or backdrop tap handler. Android
 * hardware back is consumed, and `SheetSafeOverlay` has no `onRequestClose`
 * handler until a reset fails. A failed reset can be closed explicitly or
 * through Android back without controlling the account's normal syncing.
 *
 * Discovery-only outcomes are captured from the sync op's terminal status
 * on the `isInProgress` falling edge, before the sync slice clears its round.
 * The parent selector retains the account while that terminal discovery op
 * is pending so the child can report the outcome. Reset notifications come
 * from a store side effect; their retained UI failure does not replay them.
 */
export const HdSyncOverlay = () => {
  const syncingAccountId = useLaceSelector(
    'cardanoContext.selectAccountIdInManualHdSync',
  );
  const failures = useLaceSelector('cardanoSyncUi.selectFailedResets');
  const accountId =
    syncingAccountId ?? (Object.keys(failures)[0] as AccountId | undefined);
  if (!accountId) return null;
  return <HdSyncOverlayForAccount key={accountId} accountId={accountId} />;
};

const HdSyncOverlayForAccount = ({ accountId }: { accountId: AccountId }) => {
  const { t } = useTranslation();
  const { theme, layoutSize } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, layoutSize),
    [theme, layoutSize],
  );
  const showToast = useDispatchLaceAction('ui.showToast');
  const requestReset = useDispatchLaceAction(
    'cardanoContext.requestWalletSyncReset',
  );
  const reset = useLaceSelector(
    'cardanoContext.selectWalletSyncResetOperation',
    accountId,
  );
  const failures = useLaceSelector('cardanoSyncUi.selectFailedResets');
  const error = failures[accountId];
  const hasFailed = Boolean(error);
  const dismissFailure = useDispatchLaceAction(
    'cardanoSyncUi.dismissResetFailure',
  );
  const close = useCallback(
    () => dismissFailure({ accountId }),
    [accountId, dismissFailure],
  );
  const blockedReason = useLaceSelector(
    'cardanoContext.selectWalletSyncResetBlockedReason',
    accountId,
  );
  const retry = useCallback(() => {
    requestReset({ accountId });
  }, [accountId, requestReset]);
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
    if (!isInProgress && !hasFailed) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasFailed) close();
      return true;
    });
    return () => {
      sub.remove();
    };
  }, [isInProgress, hasFailed, close]);

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

  if (!isInProgress && !hasFailed) return null;
  return (
    <SheetSafeOverlay onRequestClose={hasFailed ? close : undefined}>
      <View style={styles.overlay} testID={`${TEST_ID_PREFIX}-overlay`}>
        <View style={styles.card} testID={`${TEST_ID_PREFIX}-component`}>
          <Text.M align="center" testID={`${TEST_ID_PREFIX}-title-text`}>
            {t(
              hasFailed
                ? 'v2.account-settings.hd-wallet-sync.toast.error'
                : 'v2.account-settings.hd-wallet-sync.modal.title',
            )}
          </Text.M>
          {hasFailed ? (
            <>
              <Text.S
                align="center"
                accessibilityLiveRegion="assertive"
                testID={`${TEST_ID_PREFIX}-error`}>
                {t(error ?? 'v2.account-settings.hd-wallet-sync.toast.error')}
              </Text.S>
              {blockedReason && (
                <Text.S
                  align="center"
                  accessibilityLiveRegion="polite"
                  testID={`${TEST_ID_PREFIX}-retry-blocked`}>
                  {t(
                    blockedReason === 'pending-transactions'
                      ? 'v2.account-settings.hd-wallet-sync.pending'
                      : 'app.sync-status.syncing',
                  )}
                </Text.S>
              )}
              <Button.Primary
                disabled={Boolean(blockedReason)}
                label={t('v2.account-settings.hd-wallet-sync.retry')}
                onPress={retry}
                testID={`${TEST_ID_PREFIX}-retry`}
              />
              <Button.Secondary
                label={t('v2.generic.btn.close')}
                onPress={close}
                testID={`${TEST_ID_PREFIX}-close-button`}
              />
            </>
          ) : (
            <>
              <Loader size={32} testID={`${TEST_ID_PREFIX}-loader`} />
              {reset?.status === 'InProgress' &&
                reset.type === 'Determinate' && (
                  <ProgressBar progress={reset.progress * 100} showPercentage />
                )}
            </>
          )}
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
