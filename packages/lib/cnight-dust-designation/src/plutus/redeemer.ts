import { Serialization } from '@cardano-sdk/core';

import type { HexBlob } from '@cardano-sdk/util';

// =====================================================================
// DustAction redeemer CBOR encoder + Data.void() helper.
// =====================================================================
// Plutus enum from contract_blueprint.ts:79
//
//   DustAction = union(
//     'Create' = Constr(0, [])
//     'Burn'   = Constr(1, [])
//   )
//
// Both variants are empty constructors — same encoding shape as
// `Data.void()` from Lucid/Blaze. The dapp uses `Data.void()` for the
// spend redeemer on the registration-UTxO consumption path (update +
// deregister) and for the withdrawal redeemer on the update path. The
// validator pattern-matches the redeemer differently per script role:
//
//   - As MintingPolicy:        redeemer is DustAction (Create | Burn)
//   - As SpendingValidator:    redeemer is Data.void()
//   - As WithdrawalValidator:  redeemer is Data.void()
//
// `dustActionCreate()` and `dataVoid()` produce byte-identical CBOR
// (both Constr 0 with empty list). We keep them as separate exports
// for code-site clarity — callers should pick the semantically right
// name.
// =====================================================================

const emptyConstr = (alternative: bigint): Serialization.PlutusData =>
  Serialization.PlutusData.newConstrPlutusData(
    new Serialization.ConstrPlutusData(
      alternative,
      new Serialization.PlutusList(),
    ),
  );

export const dustActionCreate = (): Serialization.PlutusData => emptyConstr(0n);

export const dustActionBurn = (): Serialization.PlutusData => emptyConstr(1n);

export const dataVoid = (): Serialization.PlutusData => emptyConstr(0n);

export const dustActionCreateCbor = (): HexBlob => dustActionCreate().toCbor();
export const dustActionBurnCbor = (): HexBlob => dustActionBurn().toCbor();
export const dataVoidCbor = (): HexBlob => dataVoid().toCbor();
