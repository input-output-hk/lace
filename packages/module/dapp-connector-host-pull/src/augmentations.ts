import type { AuthorizedDappRef } from './lace-client';
import type {
  AuthorizedDappInfo,
  LaceResult,
  RevokeDappResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

/**
 * Guest-side side-effect dependencies this module injects for the
 * authorized-dapps bridge. The two host calls wrap `window.lace` promises as
 * Observables at the dependency layer (ADR 19) so the side effect never calls
 * the host inline — it stays marble-testable and Storybook-stubbable. The two
 * capability booleans are snapshotted at store init (ADR 41 handshake): an
 * older host without the `dapps.*` pair makes the bridge degrade silently
 * instead of firing doomed calls.
 */
export interface DappConnectorHostPullDependencies {
  /** Whether the host advertises `dapps.list` (snapshotted at store init). */
  canListAuthorizedDapps: boolean;
  /** Whether the host advertises `dapps.revoke` (snapshotted at store init). */
  canRevokeAuthorizedDapp: boolean;
  /** Pull the full host grant-table projection (wraps `dapps.list`). */
  pullAuthorizedDapps: () => Observable<LaceResult<AuthorizedDappInfo[]>>;
  /** Delete one host grant entry (wraps `dapps.revoke`). */
  revokeAuthorizedDapp: (
    ref: AuthorizedDappRef,
  ) => Observable<LaceResult<RevokeDappResult>>;
}

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends DappConnectorHostPullDependencies {}
}
