import { Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

import {
  decodeCardanoTxSignResponse,
  encodeCardanoSignRequest,
} from '../messages/cardano-tx-sign';
import { CardanoUrType } from '../ur-types';

import type { BuiltRequest } from './account';
import type {
  ChangeOutput,
  ExtraSigner,
  SigningInput,
} from '../messages/cardano-tx-sign';
import type { RequestId } from '../value-objects/request-id.vo';
import type {
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';

/** Inputs for {@link buildTxSignRequest}, all resolved by the caller. */
export interface BuildTxSignRequestParams {
  serializedTxBody: Uint8Array;
  signingInputs: readonly SigningInput[];
  changeOutputs: readonly ChangeOutput[];
  extraSigners: readonly ExtraSigner[];
  network: number;
  requestId: RequestId;
  origin?: string;
  collateralReturnPath?: ExtraSigner;
}

/** A vkey witness extracted from a tx signing response. */
export interface ParsedVkeyWitness {
  vkey: Ed25519PublicKeyHex;
  signature: Ed25519SignatureHex;
}

/** Parsed transaction signing response. */
export interface ParsedTxSignResponse {
  requestId: RequestId;
  witnesses: readonly ParsedVkeyWitness[];
  vkeyWitnessSet: Uint8Array;
}

/**
 * Assembles a transaction signing request from caller-resolved domain inputs.
 *
 * This function is pure: it does not resolve known addresses or UTXOs. The
 * caller (the signer module) supplies the serialized tx body and the already
 * mapped signing inputs, change outputs, and extra signers.
 */
export const buildTxSignRequest = ({
  serializedTxBody,
  signingInputs,
  changeOutputs,
  extraSigners,
  network,
  requestId,
  origin,
  collateralReturnPath,
}: BuildTxSignRequestParams): BuiltRequest => ({
  urType: CardanoUrType.TxSignRequest,
  cbor: encodeCardanoSignRequest({
    requestId,
    origin,
    signData: serializedTxBody,
    inputs: signingInputs,
    changeOutputs,
    extraSigners,
    network,
    collateralReturnPath,
  }),
});

const readVkeyWitnessSet = (data: Uint8Array): ParsedVkeyWitness[] => {
  const reader = new Serialization.CborReader(HexBlob.fromBytes(data));
  if (reader.peekState() === Serialization.CborReaderState.Tag) {
    const tag = reader.readTag();
    if (tag !== Serialization.CborTag.Set) {
      throw new Error(`vkey witness set has unexpected tag: ${tag}`);
    }
  }
  const count = reader.readStartArray();
  if (count === null) {
    throw new Error('vkey witness set must be a definite-length array');
  }
  const witnesses: ParsedVkeyWitness[] = [];
  for (let index = 0; index < count; index++) {
    const itemBytes = reader.readEncodedValue();
    const witness = Serialization.VkeyWitness.fromCbor(
      HexBlob.fromBytes(itemBytes),
    );
    witnesses.push({ vkey: witness.vkey(), signature: witness.signature() });
  }
  reader.readEndArray();
  return witnesses;
};

/**
 * Parses a transaction signing response, decoding the tag-258 vkey witness set
 * (an array of [vkey, signature] entries) into applicable witnesses via
 * @cardano-sdk/core. The raw set bytes are also surfaced for direct assembly.
 */
export const parseTxSignResponse = (cbor: Uint8Array): ParsedTxSignResponse => {
  const response = decodeCardanoTxSignResponse(cbor);
  return {
    requestId: response.requestId,
    witnesses: readVkeyWitnessSet(response.vkeyWitnessSet),
    vkeyWitnessSet: response.vkeyWitnessSet,
  };
};
