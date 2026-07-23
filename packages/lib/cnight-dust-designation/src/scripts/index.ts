import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import { CardanoDustNetwork } from '../value-objects/network-id.vo';

import { CNIGHT_GENERATES_DUST_MAINNET_CBOR } from './mainnet';
import { CNIGHT_GENERATES_DUST_TESTNET_CBOR } from './testnet';

// =====================================================================
// Script CBOR access — one Plutus V3 blob per network.
// =====================================================================
// Aiken's `plutus.json` `compiledCode` field is the CBOR-wrapped flat
// UPLC — i.e. `bytes(flat)`, where the hex starts with a `bytes`
// header like `590c68...` (= bytestring of 3176 bytes).
//
// The Cardano CDDL declares `plutus_v3_script = bytes`, but the
// Plutus V3 interpreter expects the *content* of that outer bytes to
// itself be CBOR-encoded — i.e. the on-chain witness shape is
// `bytes(bytes(flat))`, two `bytes` wraps. Ogmios v6 rejects single-
// wrap scripts at offset 0 ("Failed to deserialise a script: CBOR
// deserialisation failed at the offset 0").
//
// `Serialization.PlutusV3Script.fromCbor` strips exactly one outer
// `bytes` wrap and stores the inner content, so passing the raw
// `compiledCode` hex yields a single-wrap witness. We add one more
// CBOR `bytes` header here, so the SDK's strip leaves `bytes(flat)`
// intact as the stored content. `.hash()` then operates on the
// spec-correct inner form (`bytes(flat)`), and witness serialization
// emits `bytes(bytes(flat))` — what Plutus V3 expects.
// =====================================================================

export { CNIGHT_GENERATES_DUST_TESTNET_CBOR } from './testnet';
export { CNIGHT_GENERATES_DUST_MAINNET_CBOR } from './mainnet';

// Add a CBOR `bytes(...)` header in front of an already-bytes-wrapped
// hex payload, producing the double-wrap form Plutus V3 expects in
// the `plutus_v3_script` witness slot. Length encoding follows CBOR
// major-type-2 rules.
const cborWrapHexBytes = (payloadHex: string): string => {
  const lengthBytes = payloadHex.length / 2;
  let header: string;
  if (lengthBytes < 24) {
    header = (0x40 | lengthBytes).toString(16).padStart(2, '0');
  } else if (lengthBytes < 256) {
    header = '58' + lengthBytes.toString(16).padStart(2, '0');
  } else if (lengthBytes < 65536) {
    header = '59' + lengthBytes.toString(16).padStart(4, '0');
  } else if (lengthBytes < 4_294_967_296) {
    header = '5a' + lengthBytes.toString(16).padStart(8, '0');
  } else {
    throw new Error(`script too large to CBOR-wrap (${lengthBytes} bytes)`);
  }
  return header + payloadHex;
};

export const getDustGeneratorScriptCbor = (
  network: CardanoDustNetwork,
): HexBlob =>
  HexBlob(
    cborWrapHexBytes(
      network === CardanoDustNetwork.mainnet
        ? CNIGHT_GENERATES_DUST_MAINNET_CBOR
        : CNIGHT_GENERATES_DUST_TESTNET_CBOR,
    ),
  );

export const getDustGeneratorPlutusV3Script = (
  network: CardanoDustNetwork,
): Serialization.PlutusV3Script =>
  Serialization.PlutusV3Script.fromCbor(getDustGeneratorScriptCbor(network));

export const getDustGeneratorScript = (
  network: CardanoDustNetwork,
): Serialization.Script =>
  Serialization.Script.newPlutusV3Script(
    getDustGeneratorPlutusV3Script(network),
  );
