import { AuthenticationCancelledError } from '@lace-contract/signer';
import { SecretBox } from '@lace-lib/core';
import { Redacted } from '@lace-lib/util-redacted';
import { from, switchMap, throwError } from 'rxjs';

import { signBitcoinTransactionWithSeed } from './sign-bitcoin-transaction-with-seed';

import type {
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { HexBytes } from '@lace-lib/util';
import type { Observable } from 'rxjs';

/** Signs Bitcoin transactions using an in-memory wallet. */
export class BitcoinInMemoryTransactionSigner
  implements BitcoinTransactionSigner
{
  readonly #encryptedRootPrivateKey: HexBytes;
  readonly #auth: SignerAuth;

  public constructor(params: {
    encryptedRootPrivateKey: HexBytes;
    auth: SignerAuth;
  }) {
    this.#encryptedRootPrivateKey = params.encryptedRootPrivateKey;
    this.#auth = params.auth;
  }

  public sign(request: BitcoinSignRequest): Observable<BitcoinSignResult> {
    return this.#auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#auth.accessAuthSecret(authSecret =>
          from(
            this.#signTransaction(
              request.serializedTx,
              this.#encryptedRootPrivateKey,
              authSecret,
            ),
          ),
        );
      }),
    );
  }

  async #signTransaction(
    serializedTx: HexBytes,
    encryptedRootPrivateKey: HexBytes,
    authSecret: Uint8Array,
  ): Promise<BitcoinSignResult> {
    let rootPrivateKey: Redacted<Buffer> | null = null;

    try {
      const encryptedSeed = Buffer.from(encryptedRootPrivateKey, 'hex');

      const decryptedBytes = await SecretBox.open(encryptedSeed, authSecret);

      rootPrivateKey = Redacted.make(Buffer.from(decryptedBytes));

      return signBitcoinTransactionWithSeed(
        serializedTx,
        Redacted.value(rootPrivateKey),
      );
    } finally {
      if (rootPrivateKey) {
        Redacted.unsafeWipe(rootPrivateKey);
      }
    }
  }
}
