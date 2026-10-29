import { verifyCustodyDataSignature } from '@lace-lib/cardano-custody';
import { Err, Ok } from '@lace-lib/util';
import { CustomError } from 'ts-custom-error';

import type { CardanoCustodyDataPurpose } from './cardano-custody-device-signer';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { CustodyDataSignatureError } from '@lace-lib/cardano-custody';
import type { Result } from '@lace-lib/util';

/**
 * Why a custody data signature does not prove control, in the order the
 * checks run:
 *
 * - `invalid-address`, `invalid-payload`, `invalid-origin`,
 *   `invalid-purpose`: the expected address is not a Cardano address, the
 *   expected payload is not hex of at least one byte, the expected origin is
 *   not a serialized origin, or the expected purpose is unknown;
 * - `malformed-signature`, `malformed-key`: the COSE_Sign1 or COSE_Key cannot
 *   be read as a CIP-8 Ed25519 signature whose protected header binds an
 *   address, an origin and a purpose;
 * - `address-mismatch`: the signature binds another address;
 * - `origin-mismatch`: it is for another site, such as one that relayed the
 *   verifier's challenge to the user;
 * - `purpose-mismatch`: it is for another purpose, such as a sign-in
 *   presented to link an account;
 * - `payload-mismatch`: it signs another payload;
 * - `invalid-signature`: the Ed25519 signature does not verify;
 * - `device-not-listed`: a valid signature by a key the account does not list;
 * - `unexpected-key`: a listed device signed, but not the device asked to.
 */
export type CardanoCustodyDataSignatureRefusal =
  | CustodyDataSignatureError['code']
  | 'unexpected-key';

/**
 * A custody data signature does not prove control of the account. `reason`
 * names the first check it failed; `detail` carries what the check found,
 * such as the key hash of an unlisted signer.
 */
export class CardanoCustodyDataSignatureError extends CustomError {
  public readonly code = 'custody-data-signature' as const;

  public constructor(
    readonly reason: CardanoCustodyDataSignatureRefusal,
    readonly detail?: unknown,
  ) {
    super(`The custody data signature was refused: ${reason}`);
  }
}

export type VerifyCardanoCustodyDataSignatureProps = {
  /** The COSE_Sign1, CBOR hex, as `signCardanoCustodyData` returns it. */
  signature: string;
  /** The COSE_Key, CBOR hex. */
  key: string;
  /**
   * The challenge the verifier issued for this one proof, as hex, so a
   * signature cannot be replayed.
   */
  payload: string;
  /** The custody account address the signature must bind, bech32. */
  address: string;
  /**
   * The verifier's own origin, as `scheme://host[:port]` exactly as a browser
   * serializes it: the signature must be for this site, not for one that
   * relayed its challenge to the user.
   */
  origin: string;
  /** What the verifier accepts the signature for. */
  purpose: CardanoCustodyDataPurpose;
  /**
   * The device key hashes the account's control datum lists, as the verifier
   * reads them from the chain, such as with
   * `readCardanoCustodyControlDevices`. The client's word is not proof.
   */
  devices: readonly string[];
};

/** A proof of control: the listed device whose key signed. */
export type CardanoCustodyDataSignatureVerification = {
  keyHash: Ed25519KeyHashHex;
};

/**
 * Checks, without any network access, that a CIP-8 data signature proves
 * control of a Cardano custody account: the Ed25519 signature verifies over
 * its Sig_structure, its protected header binds `address`, `origin` and
 * `purpose`, it signs exactly `payload`, and its key is one of `devices`. For
 * a server that links or signs in a custody account; the challenge, the
 * origin, the purpose and the devices are the server's own, never the
 * client's. It never rejects.
 */
export const verifyCardanoCustodyDataSignature = async (
  props: VerifyCardanoCustodyDataSignatureProps,
): Promise<
  Result<
    CardanoCustodyDataSignatureVerification,
    CardanoCustodyDataSignatureError
  >
> => {
  try {
    const verified = await verifyCustodyDataSignature(props);
    if (verified.ok) return Ok({ keyHash: verified.value.keyHash });
    const { code, ...detail } = verified.error;
    return Err(
      new CardanoCustodyDataSignatureError(
        code,
        Object.keys(detail).length === 0 ? undefined : detail,
      ),
    );
  } catch (error) {
    return Err(
      new CardanoCustodyDataSignatureError('invalid-signature', error),
    );
  }
};
