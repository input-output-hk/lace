import type {
  LaceResult,
  MonolithGuestData,
  MonolithGuestDataDoneResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

/**
 * Guest-side side-effect dependencies for the monolith guest-data import. The two
 * host calls wrap `window.lace` promises as Observables at the dependency layer
 * (ADR 19) so the side effects never call the host inline — they stay
 * marble-testable and Storybook-stubbable.
 */
export interface MigrateMonolithGuestDataDependencies {
  /**
   * Whether the host advertises the PAIR — pull and report (snapshotted at store
   * init, ADR 41 handshake). Both or neither: a host that can serve the data but
   * not delete it would be re-imported from on every boot, since the legacy keys
   * are what make the pull non-empty.
   */
  canMigrateMonolithGuestData: boolean;
  /** Read the monolith's guest-owned slices (wraps
   * `settings.migrateMonolithGuestData`). Non-mutating. */
  pullMonolithGuestData: () => Observable<LaceResult<MonolithGuestData>>;
  /** Report the DURABLE import, which deletes the legacy keys (wraps
   * `settings.migrateMonolithGuestDataDone`). */
  completeMonolithGuestDataMigration: () => Observable<
    LaceResult<MonolithGuestDataDoneResult>
  >;
}

declare module '@lace-contract/module' {
  interface SideEffectDependencies
    extends MigrateMonolithGuestDataDependencies {}
}
