import type { SideEffect } from '../../index';

/**
 * Parameters passed to each collateral flow sub-side-effect.
 * Same as SideEffect signature: (actionObservables, stateObservables, dependencies).
 */
export type CollateralFlowSideEffectParams = Parameters<SideEffect>;
