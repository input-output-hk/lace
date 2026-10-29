/**
 * The `experimental` entry, which only the canary build has (ADR 66): features
 * that may be replaced or withdrawn rather than graduate to stable as they
 * are. Midnight Passport accounts, Cardano Shared Custody, and secrets
 * derived from a seed with the MIP-0015 scheme.
 *
 * The entry carries the Cardano entry too, so an app creates the wallet these
 * features run on from this entry alone, as the Bitcoin entry does for its
 * own. Each entry's declarations are bundled on their own, and a wallet typed
 * by one entry's declarations does not accept the modules another entry's
 * declarations type: their symbols and module addon names differ.
 */
export * from './cardano';
export * as m from './experimental-modules';
export * from './passport/index';
export * from './custody/index';
export type { Result } from '@lace-lib/util';

// The module system's types the Passport API names, as the root entry exports
// them.
export type {
  Contract,
  ContractActionCreators,
  ContractSelectors,
  LaceModule,
  LaceSideEffect,
  StateObservables,
} from '@lace-contract/module';

// Secrets derived from a seed with the MIP-0015 scheme, whose parameters are
// not final.
export { deriveSymmetricSecret } from '@lace-lib/crypto';
