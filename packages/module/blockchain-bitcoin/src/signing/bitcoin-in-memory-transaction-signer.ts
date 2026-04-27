import { emip3decrypt } from '@cardano-sdk/key-management';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { Redacted } from '@lace-lib/util-redacted';
import { HexBytes } from '@lace-sdk/util';
import { from, switchMap, throwError } from 'rxjs';

import {
  decodeUnsignedTxFromString,
  deriveAccountRootKeyPair,
  deriveChildKeyPair,
  tweakTaprootPrivateKey,
  AddressType,
} from '../common';
import { BitcoinSigner, signTx } from '../wallet';

import type {
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
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

      const decryptedBytes = await emip3decrypt(encryptedSeed, authSecret);

      rootPrivateKey = Redacted.make(Buffer.from(decryptedBytes));

      const tx = decodeUnsignedTxFromString(serializedTx);
      const signers = [];

      for (const signingKey of tx.signers) {
        const rootPrivateKeyValue = Redacted.value(rootPrivateKey);
        const rootKeyPair = deriveAccountRootKeyPair({
          seed: rootPrivateKeyValue,
          addressType: signingKey.addressType,
          network: signingKey.network,
          account: signingKey.account,
        });

        const keyPair = deriveChildKeyPair(
          rootKeyPair.pair.privateKey,
          signingKey.chain,
          signingKey.index,
        );

        let finalKeyPair = keyPair.pair;

        if (signingKey.addressType === AddressType.Taproot) {
          const internalXOnlyPubKey = keyPair.pair.publicKey.slice(1);
          const tweakedPrivateKey = tweakTaprootPrivateKey(
            Buffer.from(keyPair.pair.privateKey, 'hex'),
            Buffer.from(internalXOnlyPubKey, 'hex'),
          );

          finalKeyPair = {
            publicKey: keyPair.pair.publicKey,
            privateKey: Buffer.from(tweakedPrivateKey).toString('hex'),
          };
        }

        signers.push(
          new BitcoinSigner({
            publicKey: Buffer.from(finalKeyPair.publicKey, 'hex'),
            privateKey: Buffer.from(finalKeyPair.privateKey, 'hex'),
          }),
        );
      }

      const signedTx = signTx(tx, signers);

      for (const signer of signers) {
        signer.clearSecrets();
      }

      return {
        serializedTx: HexBytes.fromUTF8(
          JSON.stringify({
            network: tx.network,
            hex: signedTx.hex,
          }),
        ),
      };
    } finally {
      if (rootPrivateKey) {
        Redacted.unsafeWipe(rootPrivateKey);
      }
    }
  }
}
