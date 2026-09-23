import { makeComposerBuilding } from './composer/build-side-effect';

import type { SideEffect } from '..';

// =====================================================================
// Transaction composer — build half (SDK-safe).
// =====================================================================
// The slice + state machine live in `@lace-contract/cardano-context`'s
// `composer-flow/`. The BUILD side-effect sits here, in the Cardano
// blockchain module, because the build runs the local Cardano tx-builder
// (`TransactionBuilder`) against store-resident chain data — the
// composer request itself carries none, so no renderer ever fetches
// chain data to compose a transaction.
//
// The build half does NOT reach `@lace-contract/tx-executor`, so it
// stays SDK-bundle-safe (ADR 30) and is composed by both the full module
// entry (`index.ts`) AND the headless SDK entry (`sdk.ts`) via this
// shared `store/init.ts`.
//
// The CONFIRM/SUBMIT half lives in `composer-flow-tx-side-effects.ts`
// because it depends on tx-executor (→ authentication-prompt →
// react-i18next) and must NOT enter the SDK bundle.
//
// Wires:
//   Building → buildComposerTx → buildCompleted
// =====================================================================

export const composerFlowSideEffects: SideEffect[] = [makeComposerBuilding()];
