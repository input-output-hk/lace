import { map, merge } from 'rxjs';

import type { SideEffect } from '../../contract';

/**
 * Emits a `ui.showToast` for the terminal states of a user-initiated security
 * re-scan so the user gets acknowledgment even when they've navigated away
 * from the per-account portfolio view where the banner lives.
 *
 * Reacts to `setSecurityScanResult` (dispatched by the scan side-effect with
 * the exploit ids it found — empty when nothing matched) and to
 * `setSecurityScanFailed` (dispatched on provider errors). The activity-time
 * detector writes to activity metadata directly and does not emit these
 * actions, so no incidental toasts fire during normal sync.
 *
 * The toast copy is deliberately terse — the persistent banner carries the
 * detail; the toast is just "the scan finished".
 */
export const securityRescanToast: SideEffect = (
  { cardanoContext: { setSecurityScanResult$, setSecurityScanFailed$ } },
  _selectors,
  { actions },
) =>
  merge(
    setSecurityScanResult$.pipe(
      map(({ payload: { exploits } }) =>
        actions.ui.showToast(
          exploits.length > 0
            ? {
                text: 'wallet-security-alerts.settings.toast-scan-complete-hit',
                color: 'negative',
                duration: 4,
                leftIcon: { name: 'AlertTriangle', size: 20 },
              }
            : {
                text: 'wallet-security-alerts.settings.toast-scan-complete-clean',
                color: 'positive',
                duration: 3,
                leftIcon: { name: 'Checkmark', size: 20 },
              },
        ),
      ),
    ),
    setSecurityScanFailed$.pipe(
      map(() =>
        actions.ui.showToast({
          text: 'wallet-security-alerts.settings.toast-scan-failed',
          color: 'negative',
          duration: 4,
          leftIcon: { name: 'AlertTriangle', size: 20 },
        }),
      ),
    ),
  );
