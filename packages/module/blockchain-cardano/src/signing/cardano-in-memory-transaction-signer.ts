import { Serialization } from '@cardano-sdk/core';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { from, switchMap, throwError } from 'rxjs';

import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  CardanoTransactionSignerProps,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

/** Signs Cardano transactions using an in-memory key agent. */
export class CardanoInMemoryTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoTransactionSignerProps;

  public constructor(props: CardanoTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return this.#props.auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#props.auth.accessAuthSecret(authSecret =>
          from(this.#signTransaction(authSecret, request.serializedTx)),
        );
      }),
    );
  }

  async #signTransaction(
    authSecret: AuthSecret,
    serializedTx: HexBytes,
  ): Promise<CardanoSignResult> {
    const keyAgent = await this.#props.createKeyAgent({
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      encryptedRootPrivateKey: this.#props.encryptedRootPrivateKey,
      extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
      authSecret,
    });

    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );

    const signatures = await keyAgent.signTransaction(tx.body(), {
      knownAddresses: this.#props.knownAddresses,
      utxo: this.#props.utxo,
    });

    const witnessSet = tx.witnessSet();
    witnessSet.setVkeys(
      Serialization.CborSet.fromCore(
        [...signatures.entries()] as Parameters<
          typeof Serialization.VkeyWitness.fromCore
        >[0][],
        Serialization.VkeyWitness.fromCore,
      ),
    );

    const signedTx = new Serialization.Transaction(
      tx.body(),
      witnessSet,
      tx.auxiliaryData(),
    );

    return {
      serializedTx: HexBytes(signedTx.toCbor()),
      signatureCount: signatures.size,
    };
  }
}
