import { Serialization } from '@cardano-sdk/core';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-lib/util';
import { from, switchMap, throwError } from 'rxjs';

import type {
  CardanoKeyAgent,
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
} from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SignerAuth } from '@lace-contract/signer';
import type { Observable } from 'rxjs';

/**
 * Runs `use` with the {@link CardanoKeyAgent} for one sign call, returning
 * `use`'s result.
 *
 * The agent is provided to a callback (rather than emitted) so the signing
 * operation runs *inside* the provider's window: implementations that unlock
 * the agent under an auth-secret access can keep the secret alive until `use`
 * completes, instead of having it zeroed the instant the agent is emitted.
 */
export type WithCardanoKeyAgent$ = <T>(
  use: (keyAgent: CardanoKeyAgent) => Observable<T>,
) => Observable<T>;

export interface CardanoInMemoryTransactionSignerProps {
  withKeyAgent$: WithCardanoKeyAgent$;
  knownAddresses: GroupedAddress[];
  utxo: Cardano.Utxo[];
  auth: SignerAuth;
}

/**
 * Signs Cardano transactions with an in-memory key agent provided per call by
 * the caller-supplied {@link WithCardanoKeyAgent$}.
 */
export class CardanoInMemoryTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoInMemoryTransactionSignerProps;

  public constructor(props: CardanoInMemoryTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return this.#props.auth.authenticate().pipe(
      switchMap(confirmed => {
        if (!confirmed) {
          return throwError(() => new AuthenticationCancelledError());
        }
        return this.#props.withKeyAgent$(keyAgent =>
          from(this.#signTransaction(keyAgent, request.serializedTx)),
        );
      }),
    );
  }

  async #signTransaction(
    keyAgent: CardanoKeyAgent,
    serializedTx: HexBytes,
  ): Promise<CardanoSignResult> {
    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );

    const signatures = await keyAgent.signTransaction(tx.body(), {
      knownAddresses: this.#props.knownAddresses,
      utxo: this.#props.utxo,
      scripts: tx.toCore().witness.scripts,
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
