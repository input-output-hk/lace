import { initializeDependencies } from './dependencies';
import { nightDesignationFlowSideEffects } from './night-designation-flow-side-effects';
import { nightDesignationFlowTxSideEffects } from './night-designation-flow-tx-side-effects';
import { createCardanoSideEffects } from './side-effects';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

// Full store init for the extension/mobile apps. Identical to the
// SDK-safe `./init` PLUS the cNIGHT confirm/submit side-effects, which
// pull in `@lace-contract/tx-executor` (→ authentication-prompt →
// react-i18next) and must stay out of the headless SDK bundle (ADR 30).
// The headless SDK entry (`sdk.ts`) uses `./init` via `./store`; the full
// module entry (`index.ts`) uses this via `./store/full`.
const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => ({
  sideEffects: [
    ...createCardanoSideEffects(props.runtime.config),
    ...nightDesignationFlowSideEffects,
    ...nightDesignationFlowTxSideEffects,
  ],
  sideEffectDependencies: await initializeDependencies(props, dependencies),
});

export default redux;
