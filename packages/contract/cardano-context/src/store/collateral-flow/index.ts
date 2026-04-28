// TODO: Move slice, types, and state-machine into @lace-module/cardano-collateral-flow.
// Currently kept here because @lace-module/blockchain-cardano-ui consumes
// collateralFlow selectors/actions via useLaceSelector/useDispatchLaceAction, and
// modules cannot import from other modules (ADR 14). To fully extract:
//   1. Move the collateral UI (useCollateralState, CollateralSheet, sheet route
//      registration) from blockchain-cardano-ui into cardano-collateral-flow.
//   2. Move the slice, types, and state-machine into the module alongside the UI.
//   3. Remove this directory and the re-exports from cardano-context.
// The type-only imports from @lace-contract/tx-executor here (FeeEntry,
// TxBuildResult, etc.) are safe — they don't create the runtime import chain.
export type * from './types';
export * from './state-machine';
export * from './slice';
