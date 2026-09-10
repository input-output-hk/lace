import type {
  LaceResult,
  SetLanguageResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

/**
 * Guest-side side-effect dependencies the i18n module injects for the
 * language write-back (ADR 41 `lace.settings`, mirror of cardano-host-pull's
 * active-network push). Both wrap a `window.lace` capability probe / request at
 * the dependency layer (ADR 19) so the side effect is fully marble-testable and
 * inert off-host (no `window.lace` → the capability is absent → the effect
 * no-ops), which is the ADR 41 handshake posture in the mobile / extension
 * wrappers this shared module also loads.
 */
export interface LanguagePushDependencies {
  /**
   * Whether the host advertised the `settings.setLanguage` capability (ADR 41
   * handshake), snapshotted at store init. False off a host (mobile / extension
   * wrappers, or an older host) → the language write-back side effect no-ops
   * silently.
   */
  canSetLanguage: boolean;
  /**
   * Record the guest's active UI language with the host (ADR 41 `lace.settings`),
   * wrapping the `settings.setLanguage` request as an Observable (ADR 19). The
   * host renders its trusted surfaces in the bundled locale it matches.
   */
  pushLanguageToHost: (
    language: string,
  ) => Observable<LaceResult<SetLanguageResult>>;
}

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends LanguagePushDependencies {}
}
