import * as AccModule from './generated/index.js';

import type { Ledger } from './generated/index.js';

/**
 * Typed surface over the compact-generated Account Custody Contract
 * module. All imports of the generated code go through this wrapper so
 * the rest of the module depends on one stable, explicitly typed API:
 * the `Contract` constructor (takes the witnesses), the `ledger` decoder
 * for on-chain state, and the locally evaluated `pureCircuits`.
 */
export const { Contract, ledger, pureCircuits, expectedVk } = AccModule;
export type { Ledger };
export type { PureCircuits, Witnesses } from './generated/index.js';

/** JubJub point as the generated code represents it: affine coordinates. */
export type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';
