import { makeNightDesignationBuilding } from './night-designation/build-side-effect';
import {
  makeNightDesignationIndexRefresh,
  makeNightDesignationIndexSettling,
} from './night-designation/index-side-effect';

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
// The designation index side-effects sit here for the same reason: they read
// the script address through the Cardano provider, which the SDK bundle can
// reach — only tx-executor is off-limits on this side.
//
// Wires:
//   Building                               → buildNightDesignationTx → buildCompleted
//   nightDesignationIndex/refreshRequested → script-address scan → refreshCompleted
//   nightDesignationFlow Success           → settlingStarted → (activity settles)
//                                          → refreshRequested + settlingEnded
// =====================================================================

export const nightDesignationFlowSideEffects: SideEffect[] = [
  makeNightDesignationBuilding(),
  makeNightDesignationIndexRefresh(),
  makeNightDesignationIndexSettling(),
];
