import { makeNightDesignationBuilding } from './night-designation/build-side-effect';

import type { SideEffect } from '..';

// =====================================================================
// cNIGHT-on-Cardano DUST designation — build half (SDK-safe).
// =====================================================================
// The slice + state machine live in `@lace-contract/cardano-context`'s
// `night-designation-flow/`. The BUILD side-effect sits here, in the
// Cardano blockchain module, because the build runs the local Cardano
// tx-builder (mapping the cNIGHT blueprint via `TransactionBuilder`) — and
// keeping the flag-gated Plutus build path in the module store (which the
// service worker imports statically) keeps it out of the SW cold-boot
// `await import(...)` graph (ADR 25).
//
// The build half does NOT reach `@lace-contract/tx-executor`, so it stays
// SDK-bundle-safe (ADR 30) and is composed by both the full module entry
// (`index.ts`) AND the headless SDK entry (`sdk.ts`) via this shared
// `store/init.ts`.
//
// The CONFIRM/SUBMIT half lives in `night-designation-flow-tx-side-effects.ts`
// because it depends on tx-executor (→ authentication-prompt → react-i18next)
// and must NOT enter the SDK bundle. Only `index.ts`'s store composes it.
//
// Wires:
//   Building → buildNightDesignationTx → buildCompleted
// =====================================================================

export const nightDesignationFlowSideEffects: SideEffect[] = [
  makeNightDesignationBuilding(),
];
