import {
  createReader,
  createWriter,
  forEachMapEntry,
  readArrayItems,
  readUint,
  writeUint,
} from '@lace-lib/ur-transport';

import { RequestId } from '../value-objects/request-id.vo';

import { checkXfp, readPath, writePath } from './cbor-helpers';

import type { DerivationPath } from '../value-objects/derivation-path.vo';
import type { Xfp } from '../value-objects/xfp.vo';
import type { CborReader, CborWriter } from '@lace-lib/ur-transport';

/** Length in bytes of a UTXO transaction hash. */
export const TX_HASH_LENGTH = 32;

/** An input that needs to be signed. */
export interface SigningInput {
  txHash: Uint8Array;
  index: number;
  xfp: Xfp;
  path: DerivationPath;
}

/** A transaction output claimed to be change. xfp may be empty (unspecified). */
export interface ChangeOutput {
  index: number;
  path: DerivationPath;
  xfp: Xfp;
}

/** An additional signer required by the transaction. */
export interface ExtraSigner {
  xfp: Xfp;
  path: DerivationPath;
}

/**
 * Top-level transaction signing request.
 *
 * UR type: cardano-tx-sig-req. CDDL:
 *   {1: request_id(tstr), ?2: origin(tstr), 3: sign_data(bstr), 4: [*SigningInput],
 *    5: [*ChangeOutput], 6: [*ExtraSigner], 7: network uint,
 *    ?8: collateral_return_path(SignerPath)}
 *   SignerPath = {1: xfp(bstr .size 4), 2: path([*uint])}  ; same shape as ExtraSigner
 *
 * Key 8 declares that the tx body's collateral_return output pays back to this
 * wallet. The device derives the address from the path and, only if it matches,
 * badges the collateral return as a verified own address; absent or mismatched,
 * it is shown as an external output.
 */
export interface CardanoSignRequest {
  requestId: RequestId;
  origin?: string;
  signData: Uint8Array;
  inputs: readonly SigningInput[];
  changeOutputs: readonly ChangeOutput[];
  extraSigners: readonly ExtraSigner[];
  network: number;
  collateralReturnPath?: ExtraSigner;
}

/**
 * Device reply carrying the vkey witness set.
 *
 * UR type: cardano-tx-sig-res. CDDL:
 *   {1: request_id(tstr), 2: vkey_witness_set(bstr)}
 *
 * Key 2 is a serialized vkey witness set (a tag-258 set of vkey witnesses), NOT
 * a full transaction witness set map. It is carried as opaque bytes here.
 */
export interface CardanoTxSignResponse {
  requestId: RequestId;
  vkeyWitnessSet: Uint8Array;
}

const writeSigningInput = (writer: CborWriter, input: SigningInput): void => {
  if (input.txHash.length !== TX_HASH_LENGTH) {
    throw new Error(
      `SigningInput tx_hash must be ${TX_HASH_LENGTH} bytes, got ${input.txHash.length}`,
    );
  }
  writer.writeStartMap(4);
  writer.writeInt(1);
  writer.writeByteString(input.txHash);
  writer.writeInt(2);
  writeUint(writer, input.index);
  writer.writeInt(3);
  writer.writeByteString(input.xfp);
  writer.writeInt(4);
  writePath(writer, input.path);
};

const readSigningInput = (reader: CborReader): SigningInput => {
  let txHash: Uint8Array | undefined;
  let index: number | undefined;
  let xfp: Uint8Array | undefined;
  let path: DerivationPath | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        txHash = reader.readByteString();
        break;
      case 2:
        index = readUint(reader);
        break;
      case 3:
        xfp = reader.readByteString();
        break;
      case 4:
        path = readPath(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  if (
    txHash === undefined ||
    index === undefined ||
    xfp === undefined ||
    path === undefined
  ) {
    throw new Error('SigningInput missing required field (keys 1-4)');
  }
  if (txHash.length !== TX_HASH_LENGTH) {
    throw new Error(
      `SigningInput tx_hash must be ${TX_HASH_LENGTH} bytes, got ${txHash.length}`,
    );
  }
  return { txHash, index, xfp: checkXfp(xfp, { allowEmpty: false }), path };
};

const writeChangeOutput = (writer: CborWriter, output: ChangeOutput): void => {
  writer.writeStartMap(3);
  writer.writeInt(1);
  writeUint(writer, output.index);
  writer.writeInt(2);
  writer.writeByteString(output.xfp);
  writer.writeInt(3);
  writePath(writer, output.path);
};

const readChangeOutput = (reader: CborReader): ChangeOutput => {
  let index: number | undefined;
  let path: DerivationPath | undefined;
  let xfp: Uint8Array = new Uint8Array(0);
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        index = readUint(reader);
        break;
      case 2:
        xfp = reader.readByteString();
        break;
      case 3:
        path = readPath(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  if (index === undefined || path === undefined) {
    throw new Error('ChangeOutput missing required field (keys 1, 3)');
  }
  return { index, path, xfp: checkXfp(xfp, { allowEmpty: true }) };
};

const writeExtraSigner = (writer: CborWriter, signer: ExtraSigner): void => {
  writer.writeStartMap(2);
  writer.writeInt(1);
  writer.writeByteString(signer.xfp);
  writer.writeInt(2);
  writePath(writer, signer.path);
};

const readExtraSigner = (reader: CborReader): ExtraSigner => {
  let xfp: Uint8Array | undefined;
  let path: DerivationPath | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        xfp = reader.readByteString();
        break;
      case 2:
        path = readPath(reader);
        break;
      default:
        reader.skipValue();
    }
  });
  if (xfp === undefined || path === undefined) {
    throw new Error('ExtraSigner missing required field (keys 1, 2)');
  }
  return { xfp: checkXfp(xfp, { allowEmpty: false }), path };
};

export const encodeCardanoSignRequest = (
  request: CardanoSignRequest,
): Uint8Array => {
  const writer = createWriter();
  const numberEntries =
    6 +
    (request.origin !== undefined ? 1 : 0) +
    (request.collateralReturnPath !== undefined ? 1 : 0);
  writer.writeStartMap(numberEntries);
  writer.writeInt(1);
  writer.writeTextString(request.requestId);
  if (request.origin !== undefined) {
    writer.writeInt(2);
    writer.writeTextString(request.origin);
  }
  writer.writeInt(3);
  writer.writeByteString(request.signData);
  writer.writeInt(4);
  writer.writeStartArray(request.inputs.length);
  for (const input of request.inputs) {
    writeSigningInput(writer, input);
  }
  writer.writeInt(5);
  writer.writeStartArray(request.changeOutputs.length);
  for (const output of request.changeOutputs) {
    writeChangeOutput(writer, output);
  }
  writer.writeInt(6);
  writer.writeStartArray(request.extraSigners.length);
  for (const signer of request.extraSigners) {
    writeExtraSigner(writer, signer);
  }
  writer.writeInt(7);
  writeUint(writer, request.network);
  if (request.collateralReturnPath !== undefined) {
    writer.writeInt(8);
    writeExtraSigner(writer, request.collateralReturnPath);
  }
  return writer.encode();
};

export const decodeCardanoSignRequest = (
  data: Uint8Array,
): CardanoSignRequest => {
  const reader = createReader(data);
  let requestId: string | undefined;
  let origin: string | undefined;
  let signData: Uint8Array | undefined;
  let network: number | undefined;
  let inputs: SigningInput[] = [];
  let changeOutputs: ChangeOutput[] = [];
  let extraSigners: ExtraSigner[] = [];
  let collateralReturnPath: ExtraSigner | undefined;

  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        origin = reader.readTextString();
        break;
      case 3:
        signData = reader.readByteString();
        break;
      case 4:
        inputs = readArrayItems(reader, readSigningInput);
        break;
      case 5:
        changeOutputs = readArrayItems(reader, readChangeOutput);
        break;
      case 6:
        extraSigners = readArrayItems(reader, readExtraSigner);
        break;
      case 7:
        network = readUint(reader);
        break;
      case 8:
        collateralReturnPath = readExtraSigner(reader);
        break;
      default:
        reader.skipValue();
    }
  });

  if (requestId === undefined) {
    throw new Error('cardano-tx-sig-req missing request_id (key 1)');
  }
  if (signData === undefined) {
    throw new Error('cardano-tx-sig-req missing sign_data (key 3)');
  }
  if (network === undefined) {
    throw new Error('cardano-tx-sig-req missing network (key 7)');
  }

  return {
    requestId: RequestId(requestId),
    origin,
    signData,
    inputs,
    changeOutputs,
    extraSigners,
    network,
    collateralReturnPath,
  };
};

export const encodeCardanoTxSignResponse = (
  response: CardanoTxSignResponse,
): Uint8Array => {
  const writer = createWriter();
  writer.writeStartMap(2);
  writer.writeInt(1);
  writer.writeTextString(response.requestId);
  writer.writeInt(2);
  writer.writeByteString(response.vkeyWitnessSet);
  return writer.encode();
};

export const decodeCardanoTxSignResponse = (
  data: Uint8Array,
): CardanoTxSignResponse => {
  const reader = createReader(data);
  let requestId = '';
  let vkeyWitnessSet: Uint8Array | undefined;
  forEachMapEntry(reader, key => {
    switch (key) {
      case 1:
        requestId = reader.readTextString();
        break;
      case 2:
        vkeyWitnessSet = reader.readByteString();
        break;
      default:
        reader.skipValue();
    }
  });
  if (vkeyWitnessSet === undefined) {
    throw new Error('cardano-tx-sig-res missing vkey_witness_set (key 2)');
  }
  return { requestId: RequestId(requestId), vkeyWitnessSet };
};
