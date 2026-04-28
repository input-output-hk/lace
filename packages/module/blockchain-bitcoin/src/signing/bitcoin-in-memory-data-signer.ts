import { emip3decrypt } from '@cardano-sdk/key-management';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { Redacted } from '@lace-lib/util-redacted';
import * as bitcoin from 'bitcoinjs-lib';
import { from, switchMap, throwError } from 'rxjs';

import {
  AddressType,
  ChainType,
  deriveAccountRootKeyPair,
  deriveChildKeyPair,
} from '../common';

import { bip322SignData } from './bip322-sign-data';

import type {
  BitcoinDataSigner,
  BitcoinSignDataRequest,
  BitcoinSignDataResult,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { HexBytes } from '@lace-sdk/util';
import type { Observable } from 'rxjs';

interface BitcoinDataSignerProps {
  encryptedRootPrivateKey: HexBytes;
  auth: SignerAuth;
  network: BitcoinNetwork;
  accountIndex: number;
}

/**
 * Signs arbitrary messages using BIP-322 Generic Signed Message Format.
 *
 * Follows the same authentication and key derivation pattern as
 * BitcoinInMemoryTransactionSigner: triggers user authentication,
 * decrypts the root private key, derives the P2WPKH signing key,
 * and produces a BIP-322 Simple proof.
 */
export class BitcoinInMemoryDataSigner implements BitcoinDataSigner {
  readonly #encryptedRootPrivateKey: HexBytes;
  readonly #auth: SignerAuth;
  readonly #network: BitcoinNetwork;
  readonly #accountIndex: number;

  public constructor(props: BitcoinDataSignerProps) {
    this.#encryptedRootPrivateKey = props.encryptedRootPrivateKey;
    this.#auth = props.auth;
    this.#network = props.network;
    this.#accountIndex = props.accountIndex;
  }

  public signData(
    request: BitcoinSignDataRequest,
  ): Observable<BitcoinSignDataResult> {
    return this.#auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#auth.accessAuthSecret(authSecret =>
          from(this.#signData(authSecret, request)),
        );
      }),
    );
  }

  async #signData(
    authSecret: Uint8Array,
    request: BitcoinSignDataRequest,
  ): Promise<BitcoinSignDataResult> {
    let rootPrivateKey: Redacted<Buffer> | null = null;

    try {
      const encryptedSeed = Buffer.from(this.#encryptedRootPrivateKey, 'hex');
      const decryptedBytes = await emip3decrypt(encryptedSeed, authSecret);
      rootPrivateKey = Redacted.make(Buffer.from(decryptedBytes));

      const rootKeyPair = deriveAccountRootKeyPair({
        seed: Redacted.value(rootPrivateKey),
        addressType: AddressType.NativeSegWit,
        network: this.#network,
        account: this.#accountIndex,
      });

      const childKeyPair = deriveChildKeyPair(
        rootKeyPair.pair.privateKey,
        ChainType.External,
        0,
      );

      const bitcoinJsNetwork =
        this.#network === BitcoinNetwork.Mainnet
          ? bitcoin.networks.bitcoin
          : bitcoin.networks.testnet;

      const derivedAddress = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(childKeyPair.pair.publicKey, 'hex'),
        network: bitcoinJsNetwork,
      }).address;

      if (derivedAddress !== request.address) {
        throw new Error(
          `Address mismatch: requested ${request.address} but derived key produces ${derivedAddress}`,
        );
      }

      const childPrivateKey = Buffer.from(childKeyPair.pair.privateKey, 'hex');
      try {
        return bip322SignData(
          {
            privateKey: childPrivateKey,
            publicKey: Buffer.from(childKeyPair.pair.publicKey, 'hex'),
            network: bitcoinJsNetwork,
          },
          request,
        );
      } finally {
        childPrivateKey.fill(0);
      }
    } finally {
      if (rootPrivateKey) {
        Redacted.unsafeWipe(rootPrivateKey);
      }
    }
  }
}
