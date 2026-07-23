import { Buffer } from 'buffer';

import { blake2b, SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { Bip32Account } from '@cardano-sdk/key-management';
import {
  cip8SignData,
  deriveDRepKeyHash,
} from '@lace-contract/cardano-context';
import {
  buildDataSignRequest,
  KeystoneUrType,
  parseDataSignResponse,
  RequestId,
} from '@lace-lib/cardano-keystone-protocol';
import { defer } from 'rxjs';
import { v4 } from 'uuid';

import { KEYSTONE_REQUEST_ORIGIN } from '../../const';
import { runAirGappedQrExchange } from '../../shared/run-qr-exchange';

import { fullDerivationPath, xfpFromMasterFingerprint } from './keystone-paths';

import type { Cardano as CardanoTypes } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress, KeyRole } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
  MasterFingerprint,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export interface CardanoKeystoneDataSignerProps {
  accountIndex: number;
  chainId: CardanoTypes.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
  knownAddresses: GroupedAddress[];
}

/**
 * Signs CIP-8 data with an air-gapped Keystone by displaying the CIP-8
 * Sig_structure as an animated 'cardano-sign-data-request' QR and scanning
 * the device's 'cardano-sign-data-signature' reply. The device returns only
 * the raw Ed25519 signature and public key, so the shared cip8SignData helper
 * resolves the signing path (payment role 0, stake role 2, DRep role 3) and
 * assembles the COSE_Sign1 and COSE_Key structures on the host, with the QR
 * exchange plugged in as its signBlob step.
 */
export class CardanoKeystoneDataSigner implements CardanoDataSigner {
  readonly #props: CardanoKeystoneDataSignerProps;

  public constructor(props: CardanoKeystoneDataSignerProps) {
    this.#props = props;
  }

  public signData(
    request: CardanoSignDataRequest,
  ): Observable<CardanoSignDataResult> {
    return defer(async () => this.#signData(request));
  }

  async #signData(
    request: CardanoSignDataRequest,
  ): Promise<CardanoSignDataResult> {
    const dRepKeyHash = await deriveDRepKeyHash({
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
    });
    return cip8SignData({
      keyAgent: {
        signBlob: async (derivationPath, blob) =>
          this.#signBlob(derivationPath, blob),
      },
      request,
      knownAddresses: this.#props.knownAddresses,
      dRepKeyHash,
    });
  }

  async #signBlob(
    derivationPath: { role: number; index: number },
    blob: HexBlob,
  ): Promise<{ signature: string; publicKey: string }> {
    const requestId = RequestId(v4());
    const signRequest = buildDataSignRequest({
      requestId,
      signData: new Uint8Array(Buffer.from(blob, 'hex')),
      path: fullDerivationPath(
        this.#props.accountIndex,
        derivationPath.role,
        derivationPath.index,
      ),
      xfp: xfpFromMasterFingerprint(this.#props.masterFingerprint),
      signingKeyPublicKey: await this.#deriveSigningKeyPublicKey(
        derivationPath,
      ),
      origin: KEYSTONE_REQUEST_ORIGIN,
    });
    const result = await runAirGappedQrExchange({
      request: { urType: signRequest.urType, cbor: signRequest.cbor },
      expectedResponseType: KeystoneUrType.DataSignResponse,
    });
    const parsed = parseDataSignResponse(result);
    if (parsed.requestId !== requestId) {
      throw new Error(
        `Keystone returned a stale or mismatched response: expected request id ${requestId}, got ${parsed.requestId}`,
      );
    }
    return {
      signature: Buffer.from(parsed.signature).toString('hex'),
      publicKey: Buffer.from(parsed.publicKey).toString('hex'),
    };
  }

  /**
   * Soft-derives the 32-byte public key of the signing key at the given
   * role/index from the account extended public key. The device verifies the
   * request against the key at the requested derivation path, so the request
   * must carry that exact child key rather than the account-level key.
   */
  async #deriveSigningKeyPublicKey(derivationPath: {
    role: number;
    index: number;
  }): Promise<Uint8Array> {
    const bip32Account = new Bip32Account(
      {
        accountIndex: this.#props.accountIndex,
        chainId: this.#props.chainId,
        extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
      },
      { blake2b, bip32Ed25519: await SodiumBip32Ed25519.create() },
    );
    const publicKey = await bip32Account.derivePublicKey({
      index: derivationPath.index,
      role: derivationPath.role as KeyRole,
    });
    return new Uint8Array(Buffer.from(publicKey, 'hex'));
  }
}
