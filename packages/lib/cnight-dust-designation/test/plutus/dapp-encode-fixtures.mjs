// =====================================================================
// CBOR-fixture producer using the upstream dapp's encoder.
// =====================================================================
// Consumed by `cbor-byte-compare.test.ts` to verify our Carbon-local
// `Serialization.PlutusData`-based encoder produces byte-identical
// output to the dapp's `@blaze-cardano/data` `serialize().toCbor()`.
//
// NOT run as part of the vitest suite (`.mjs` extension keeps it
// outside `**/*.test.ts`'s glob). Run manually when:
//
//   - The dapp's blueprint at `src/config/contract_blueprint.ts` is
//     updated upstream (new schema fields, ctor reorder, etc.)
//   - Suspected drift between our encoder and Blaze (e.g. new
//     `@blaze-cardano/data` version)
//
// Reproduction:
//
//   1. Clone https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp
//      and cp this file into the repo root (the dapp's node_modules
//      has `@blaze-cardano/data`; Carbon's doesn't — running from
//      anywhere else fails with ERR_MODULE_NOT_FOUND)
//   2. From inside the dapp dir: `node dapp-encode-fixtures.mjs`
//   3. Paste the JSON into the `DAPP_FIXTURES` const in
//      `cbor-byte-compare.test.ts`.
//
// The schema definitions below are verbatim from the dapp's
// `src/config/contract_blueprint.ts:79-93` — the shapes the on-chain
// validator's Aiken types compile to.

import { Type, serialize } from '@blaze-cardano/data';

const Contracts = Type.Module({
  DustAction: Type.Union([
    Type.Literal('Create', { ctor: 0n }),
    Type.Literal('Burn', { ctor: 1n }),
  ]),
  DustMappingDatum: Type.Object(
    {
      c_wallet: Type.Union([
        Type.Object({
          VerificationKey: Type.Tuple([Type.String()], { ctor: 0n }),
        }),
        Type.Object({
          Script: Type.Tuple([Type.String()], { ctor: 1n }),
        }),
      ]),
      dust_address: Type.String(),
    },
    { ctor: 0n },
  ),
});

const DustAction = Contracts.Import('DustAction');
const DustMappingDatum = Contracts.Import('DustMappingDatum');

const STAKE_KEY_HASH_HEX = '00'.repeat(28);
const DUST_PUBKEY_HEX_SEQUENTIAL = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, '0'),
).join('');
const SCRIPT_HASH_HEX = 'ff'.repeat(28);

const out = {
  dustActionCreate: serialize(DustAction, 'Create').toCbor(),
  dustActionBurn: serialize(DustAction, 'Burn').toCbor(),

  datumVkAllZeroStakeSequentialDust: serialize(DustMappingDatum, {
    c_wallet: { VerificationKey: [STAKE_KEY_HASH_HEX] },
    dust_address: DUST_PUBKEY_HEX_SEQUENTIAL,
  }).toCbor(),

  datumScriptCredAllFFAllZeroDust: serialize(DustMappingDatum, {
    c_wallet: { Script: [SCRIPT_HASH_HEX] },
    dust_address: '00'.repeat(32),
  }).toCbor(),

  datumVkAsymStakeAsymDust: serialize(DustMappingDatum, {
    c_wallet: { VerificationKey: ['ab'.repeat(28)] },
    dust_address: 'ef'.repeat(32),
  }).toCbor(),
};

// eslint-disable-next-line no-console -- standalone fixture-printer script; output piped into golden fixture files.
console.log(JSON.stringify(out, null, 2));
