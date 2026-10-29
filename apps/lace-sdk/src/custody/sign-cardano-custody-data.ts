import { createCustodyAccountRecord } from '@lace-lib/cardano-custody';
import { Err, Ok } from '@lace-lib/util';

import {
  CardanoCustodyDeviceNotListedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyUnsupportedSignerError,
  custodyAccountNotLiveError,
} from './cardano-custody-errors';
import { verifiedIdentityOf } from './cardano-custody-records';
import {
  readCardanoCustodyAccount,
  readConfirmedCardanoCustodyAccountState,
} from './cardano-custody-wallet';
import {
  CardanoCustodyDataSignatureError,
  verifyCardanoCustodyDataSignature,
} from './verify-cardano-custody-data-signature';

import type {
  CardanoCustodyDataPurpose,
  CardanoCustodyDeviceSigner,
} from './cardano-custody-device-signer';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { HexBlob } from '@cardano-sdk/util';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Result } from '@lace-lib/util';

/** The options of `signCardanoCustodyData`. */
export type SignCardanoCustodyDataProps = {
  /** An owner account this app's device is bound to. */
  accountId: AccountId;
  /**
   * The bytes to sign, as hex: a challenge the verifying site issued for this
   * one proof, such as a nonce. The device's consent shows it as text when
   * it is printable UTF-8.
   */
  payload: HexBlob;
  /** Whether the user signs in to the site or links the account to it. */
  purpose: CardanoCustodyDataPurpose;
  /** The bound device's signer; it must serve `signData`. */
  deviceSigner: CardanoCustodyDeviceSigner;
};

/**
 * A proof that a listed device controls a custody account, for the site
 * that issued the challenge: the CIP-8 COSE_Sign1 and COSE_Key, the account
 * address and the site origin the signature binds, and the key hash of the
 * device that signed.
 */
export type CardanoCustodySignedData = {
  /** The CIP-8 COSE_Sign1, CBOR hex. */
  signature: HexBlob;
  /** The COSE_Key of the device key, CBOR hex. */
  key: HexBlob;
  /** The custody account address the signature binds. */
  address: Cardano.PaymentAddress;
  /** The origin of the only site that accepts the signature. */
  origin: string;
  /** The key hash of the device that signed. */
  keyHash: Ed25519KeyHashHex;
};

/**
 * Signs `payload` with the account's bound device key, as proof that the
 * device controls the custody account: a CIP-8 signature whose protected
 * header binds the account address, the site origin and `purpose`. The
 * origin is the device signer's: this app as the hosted signer saw it, or
 * the local signer's own. A site verifies the signature with
 * `verifyCardanoCustodyDataSignature`, for its own origin and the purpose
 * it asked for, against the devices the account's control datum lists on
 * chain.
 *
 * It refuses before the device is asked: an account the wallet opened as an
 * observer, an account with no single readable confirmed control state
 * (`account-not-live`), a device the confirmed state does not list
 * ({@link CardanoCustodyDeviceNotListedError}), and a device signer without
 * `signData` ({@link CardanoCustodyUnsupportedSignerError}). The signer's
 * answer is verified like a site would verify it, and must be by the bound
 * device ({@link CardanoCustodyDataSignatureError}). Nothing is submitted, so
 * an operation in flight on the account does not block it. It never rejects.
 *
 * @param wallet - A wallet holding the account.
 * @returns A `Result`: the signature, the device key, and the address, origin
 *   and key hash the proof binds.
 */
export const signCardanoCustodyData = async (
  wallet: Pick<WalletWithCardanoCustody, 'stateObservables'>,
  { accountId, payload, purpose, deviceSigner }: SignCardanoCustodyDataProps,
): Promise<Result<CardanoCustodySignedData, Error>> => {
  try {
    const account = await readCardanoCustodyAccount(wallet, accountId);
    const { device } = account.blockchainSpecific;
    if (!device) {
      return Err(new CardanoCustodyInvalidOperationError('observer-account'));
    }
    const identity = verifiedIdentityOf(account);
    // The site verifies against the chain, so only a confirmed state counts:
    // a device added by a transaction still in flight cannot prove control.
    const confirmed = await readConfirmedCardanoCustodyAccountState(
      wallet,
      account,
    );
    if (confirmed?.status !== 'live') {
      return Err(custodyAccountNotLiveError(confirmed));
    }
    if (!confirmed.currentDeviceListed) {
      return Err(new CardanoCustodyDeviceNotListedError(device.keyHash));
    }
    if (!deviceSigner.signData) {
      return Err(
        new CardanoCustodyUnsupportedSignerError('unsupported-request'),
      );
    }

    const signed = await deviceSigner.signData({
      payload,
      purpose,
      accountRecord: createCustodyAccountRecord(identity),
      controlUtxo: confirmed.controlUtxo,
      chainId: identity.chainId,
      device,
    });
    const verified = await verifyCardanoCustodyDataSignature({
      signature: signed.signature,
      key: signed.key,
      payload,
      address: identity.address,
      origin: signed.origin,
      purpose,
      devices: confirmed.state.devices,
    });
    if (verified.isErr()) return verified;
    if (verified.value.keyHash !== device.keyHash.toLowerCase()) {
      return Err(
        new CardanoCustodyDataSignatureError('unexpected-key', {
          keyHash: verified.value.keyHash,
        }),
      );
    }
    return Ok({
      signature: signed.signature,
      key: signed.key,
      address: identity.address,
      origin: signed.origin,
      keyHash: verified.value.keyHash,
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
