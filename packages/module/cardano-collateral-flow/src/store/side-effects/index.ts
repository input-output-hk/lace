import { merge } from 'rxjs';

import { awaitingUtxoSideEffect } from './awaiting-utxo';
import { buildingSideEffect } from './building';
import { confirmingSideEffect } from './confirming';
import { discardingSideEffect } from './discarding';
import { reclaimingSideEffect } from './reclaiming';
import { requestedSideEffect } from './requested';
import { settingUnspendableSideEffect } from './setting-unspendable';
import { submittingSideEffect } from './submitting';

import type { SideEffect } from '../../index';

/**
 * Creates collateral flow side effects.
 * Composes all state-specific side effects (Requested, Building, Confirming, etc.)
 * into a single observable that handles the full collateral flow lifecycle.
 */
export const createCollateralFlowSideEffects =
  (): SideEffect => (actionObservables, stateObservables, dependencies) =>
    merge(
      requestedSideEffect(actionObservables, stateObservables, dependencies),
      buildingSideEffect(actionObservables, stateObservables, dependencies),
      confirmingSideEffect(actionObservables, stateObservables, dependencies),
      submittingSideEffect(actionObservables, stateObservables, dependencies),
      settingUnspendableSideEffect(
        actionObservables,
        stateObservables,
        dependencies,
      ),
      awaitingUtxoSideEffect(actionObservables, stateObservables, dependencies),
      discardingSideEffect(actionObservables, stateObservables, dependencies),
      reclaimingSideEffect(actionObservables, stateObservables, dependencies),
    );
