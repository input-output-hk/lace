import * as Crypto from '@cardano-sdk/crypto';
import { blake2b } from '@cardano-sdk/crypto';
import { Bip32Account, KeyRole } from '@cardano-sdk/key-management';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { from, switchMap, throwError } from 'rxjs';

import { cip8SignData } from './cip8-sign-data';

import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
  CardanoSignerProps,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

/** Signs arbitrary data per CIP-8 using an in-memory key agent. */
export class CardanoInMemoryDataSigner implements CardanoDataSigner {
  readonly #props: CardanoSignerProps;

  public constructor(props: CardanoSignerProps) {
    this.#props = props;
  }

  public signData(
    request: CardanoSignDataRequest,
  ): Observable<CardanoSignDataResult> {
    return this.#props.auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#props.auth.accessAuthSecret(authSecret =>
          from(this.#signData(authSecret, request)),
        );
      }),
    );
  }

  async #signData(
    authSecret: AuthSecret,
    request: CardanoSignDataRequest,
  ): Promise<CardanoSignDataResult> {
    const dRepKeyHash = await this.#deriveDRepKeyHash();
    const keyAgent = await this.#props.createKeyAgent({
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      encryptedRootPrivateKey: this.#props.encryptedRootPrivateKey,
      extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
      authSecret,
    });

    return cip8SignData({
      keyAgent,
      request,
      knownAddresses: this.#props.knownAddresses,
      dRepKeyHash,
    });
  }

  async #deriveDRepKeyHash(): Promise<Ed25519KeyHashHex> {
    const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
    const bip32Account = new Bip32Account(
      {
        accountIndex: this.#props.accountIndex,
        chainId: this.#props.chainId,
        extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
      },
      { blake2b, bip32Ed25519 },
    );
    const dRepPubKey = await bip32Account.derivePublicKey({
      index: 0,
      role: KeyRole.DRep,
    });
    return Crypto.Ed25519PublicKey.fromHex(dRepPubKey).hash().hex();
  }
}
