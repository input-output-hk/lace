import { decodeCryptoPsbt, encodeCryptoPsbt } from '../messages/crypto-psbt';
import { BitcoinUrType } from '../ur-types';

/** A built UR request ready for transport: its UR type and tagged CBOR body. */
export interface BuiltRequest {
  urType: BitcoinUrType;
  cbor: Uint8Array;
}

/**
 * Builds a PSBT sign request as a crypto-psbt UR message wrapping the raw PSBT
 * bytes.
 */
export const buildSignRequest = (psbtBytes: Uint8Array): BuiltRequest => ({
  urType: BitcoinUrType.Psbt,
  cbor: encodeCryptoPsbt(psbtBytes),
});

/** Encodes raw PSBT bytes into a crypto-psbt sign request. */
export const encodeSignRequest = (psbtBytes: Uint8Array): BuiltRequest =>
  buildSignRequest(psbtBytes);

/**
 * Parses a signed crypto-psbt response back into the raw signed PSBT bytes.
 *
 * @throws if the CBOR is not a crypto-psbt message.
 */
export const parseSignResponse = (cbor: Uint8Array): Uint8Array =>
  decodeCryptoPsbt(cbor);
