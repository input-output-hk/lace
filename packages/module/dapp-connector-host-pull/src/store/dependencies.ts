import { hasLaceCapability } from '@lace-lib/extension-shell-client';
import { from } from 'rxjs';

import { listAuthorizedDapps, revokeAuthorizedDappGrant } from '../lace-client';

import type { DappConnectorHostPullDependencies } from '../augmentations';

/**
 * Wrap the two host grant-table calls as Observables (ADR 19) and snapshot
 * the capability pair once at store init (ADR 41 handshake — the
 * cardano-host-pull `canSetActiveNetwork` pattern): an older host without
 * `dapps.*` makes the bridge a silent no-op.
 */
export const initializeDependencies =
  (): DappConnectorHostPullDependencies => ({
    canListAuthorizedDapps: hasLaceCapability('dapps.list'),
    canRevokeAuthorizedDapp: hasLaceCapability('dapps.revoke'),
    pullAuthorizedDapps: () => from(listAuthorizedDapps()),
    revokeAuthorizedDapp: ref => from(revokeAuthorizedDappGrant(ref)),
  });
