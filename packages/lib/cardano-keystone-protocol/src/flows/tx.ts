import { Buffer } from 'buffer';

import {
  CardanoSignRequest,
  CardanoSignature,
} from '@keystonehq/bc-ur-registry-cardano';

import { MissingProtocolFieldError } from '../errors';
import { KeystoneUrType } from '../ur-types';
import { DerivationPath } from '../value-objects/derivation-path.vo';
import { RequestId } from '../value-objects/request-id.vo';
import { Xfp } from '../value-objects/xfp.vo';

import { assertUrType, toCborBytes } from './registry-helpers';

import type { BuiltRequest } from './account';
import type {
  CardanoCertKeyData,
  CardanoUtxoData,
} from '@keystonehq/bc-ur-registry-cardano';
import type { UrResult } from '@lace-lib/ur-transport';

/** Length in bytes of a Cardano transaction id. */
export const TRANSACTION_HASH_LENGTH = 32;

const LOVELACE_PATTERN = /^\d+$/;

/**
 * One wallet-owned input of the transaction being signed. The device cannot
 * fetch anything itself, so every own input must carry its amount, address,
 * and derivation path for the device to display totals and compute the fee.
 */
export interface TxSigningInput {
  transactionHash: Uint8Array;
  index: number;
  amount: bigint | string;
  address: string;
  path: DerivationPath;
  xfp: Xfp;
}

/**
 * A non-input signer required by the transaction (stake key, certificate,
 * withdrawal, DRep, or required signer), identified by its key hash and the
 * derivation path the device should sign with.
 */
export interface TxExtraSigner {
  keyHash: Uint8Array;
  path: DerivationPath;
  xfp: Xfp;
}

/** Inputs for {@link buildTxSignRequest}, all resolved by the caller. */
export interface BuildTxSignRequestParams {
  requestId: RequestId;
  signData: Uint8Array;
  utxos: readonly TxSigningInput[];
  extraSigners: readonly TxExtraSigner[];
  origin?: string;
}

/** Parsed transaction signing response. */
export interface ParsedTxSignResponse {
  requestId: RequestId;
  witnessSet: Uint8Array;
}

const toLovelaceString = (amount: bigint | string): string => {
  const value = typeof amount === 'bigint' ? amount.toString() : amount;
  if (!LOVELACE_PATTERN.test(value)) {
    throw new Error(`amount must be a non-negative lovelace value: ${value}`);
  }
  return value;
};

const toUtxoData = (utxo: TxSigningInput): CardanoUtxoData => {
  if (utxo.transactionHash.length !== TRANSACTION_HASH_LENGTH) {
    throw new Error(
      `transaction hash must be ${TRANSACTION_HASH_LENGTH} bytes, got ${utxo.transactionHash.length}`,
    );
  }
  return {
    transactionHash: Buffer.from(utxo.transactionHash).toString('hex'),
    index: utxo.index,
    amount: toLovelaceString(utxo.amount),
    xfp: Xfp.toHex(utxo.xfp),
    hdPath: DerivationPath.toPathString(utxo.path),
    address: utxo.address,
  };
};

const toCertKeyData = (signer: TxExtraSigner): CardanoCertKeyData => ({
  keyHash: Buffer.from(signer.keyHash).toString('hex'),
  xfp: Xfp.toHex(signer.xfp),
  keyPath: DerivationPath.toPathString(signer.path),
});

/**
 * Assembles a cardano-sign-request from caller-resolved domain inputs. The
 * signData is the full serialized unsigned transaction CBOR; the caller (the
 * signer module) supplies the already mapped own inputs and extra signers.
 */
export const buildTxSignRequest = ({
  requestId,
  signData,
  utxos,
  extraSigners,
  origin,
}: BuildTxSignRequestParams): BuiltRequest => {
  const request = CardanoSignRequest.constructCardanoSignRequest(
    Buffer.from(signData),
    utxos.map(toUtxoData),
    extraSigners.map(toCertKeyData),
    requestId,
    origin,
  );
  return { urType: KeystoneUrType.TxSignRequest, cbor: toCborBytes(request) };
};

/**
 * Parses a cardano-signature response into the echoed request id and the raw
 * CBOR-encoded transaction witness set bytes. Merging the witnesses into the
 * transaction is the consuming signer module's responsibility.
 */
export const parseTxSignResponse = (
  response: UrResult,
): ParsedTxSignResponse => {
  assertUrType(KeystoneUrType.TxSignResponse, response);
  const signature = CardanoSignature.fromCBOR(Buffer.from(response.cbor));
  const requestIdBytes: Uint8Array | undefined = signature.getRequestId();
  if (requestIdBytes === undefined || requestIdBytes.length === 0) {
    throw new MissingProtocolFieldError('request id');
  }
  const witnessSet: Uint8Array | undefined = signature.getWitnessSet();
  if (witnessSet === undefined || witnessSet.length === 0) {
    throw new MissingProtocolFieldError('witness set');
  }
  return {
    requestId: RequestId.fromBytes(Uint8Array.from(requestIdBytes)),
    witnessSet: Uint8Array.from(witnessSet),
  };
};
