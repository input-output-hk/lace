// =====================================================================
// NightDesignationError — typed failure shapes the lib produces.
// =====================================================================
// Designed for the Carbon UI's empty-state + validation surfaces. Each
// variant carries enough context for the user to act:
//
//   - 'no-cnight': wallet has zero cNIGHT — needs to acquire some first
//   - 'no-stake-credential': payment address has no stake credential
//     (enterprise address); script's `check_auth` cannot succeed
//   - 'dust-address-too-long': the 33-byte on-chain limit is hit
//   - 'no-registration-utxo': update/deregister with nothing to spend
//   - 'no-cardano-utxos': wallet has no ADA at all
//   - 'phase-2-not-implemented': full tx-assembly is deferred to the
//     hoist into the workspace tx-executor (Phase 2). The Carbon-local
//     lib in this directory only exposes the deterministic primitives
//     (datum, redeemer, script-address, mint asset id, required-signers
//     list); the actual coin-selection + fee-calc + ex-units evaluation
//     + balancing lands when the lib is hoisted.
// =====================================================================
export type NightDesignationError =
  | {
      code: 'dust-address-too-long';
      message: string;
      actualBytes: number;
      maxBytes: number;
    }
  | { code: 'no-cardano-utxos'; message: string }
  | { code: 'no-cnight'; message: string }
  | { code: 'no-registration-utxo'; message: string }
  | { code: 'no-stake-credential'; message: string }
  | { code: 'phase-2-not-implemented'; message: string };

export type Result<T, E = NightDesignationError> =
  | { ok: false; error: E }
  | { ok: true; value: T };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

// `Err` is the conventional Result-constructor name (mirrors
// `@lace-lib/util`'s `Ok`/`Err`); the abbreviation is intentional.
// eslint-disable-next-line unicorn/prevent-abbreviations
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
