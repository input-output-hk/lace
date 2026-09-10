import { getSystemLanguage } from '@lace-contract/i18n';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  ignoreElements,
  map,
  switchMap,
} from 'rxjs';

import type { SideEffect } from '../..';

/**
 * Write the guest's active UI language back to the host (ADR 41 `lace.settings`)
 * on boot and on every change, so the host renders its trusted surfaces
 * (create/import/manager/dapp-connect/…) in the bundled locale that matches the
 * guest. The host holds no display state of its own (ADR 33), so without this
 * write-back a host surface would always fall back to the device language /
 * English regardless of the language the guest is showing.
 *
 * The EFFECTIVE language mirrors the guest's own resolution: an explicit user
 * choice wins; otherwise the device language (`getSystemLanguage`) — the same
 * value the guest UI resolves — so a user who never picked a language still
 * sees host surfaces in their device language.
 *
 * Write-through only — it dispatches NO action (the host record is the effect).
 *
 * - FEATURE-GATED (ADR 41 handshake): a host without the `settings.setLanguage`
 *   capability (`canSetLanguage` false — including the mobile / extension
 *   wrappers, which have no `window.lace` host at all) makes this a silent
 *   no-op; the guest degrades rather than firing a doomed call.
 * - WIRE-ERROR TOLERANT (ADR 15): a failed write-back is swallowed and never
 *   breaks the guest — the next language change re-pushes.
 */
export const pushLanguage: SideEffect = (
  _,
  { views: { selectLanguage$, selectHasExplicitLanguagePreference$ } },
  { canSetLanguage, pushLanguageToHost },
) => {
  if (!canSetLanguage) return EMPTY;
  return combineLatest([
    selectLanguage$,
    selectHasExplicitLanguagePreference$,
  ]).pipe(
    map(([language, hasExplicitPreference]): string =>
      hasExplicitPreference ? language : getSystemLanguage(),
    ),
    distinctUntilChanged(),
    switchMap(language =>
      pushLanguageToHost(language).pipe(
        catchError(() => EMPTY),
        ignoreElements(),
      ),
    ),
  );
};
