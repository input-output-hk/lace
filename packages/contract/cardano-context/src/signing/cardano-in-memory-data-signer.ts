import { AuthenticationCancelledError } from '@lace-contract/signer';
import { from, switchMap, throwError } from 'rxjs';

import { cip8SignData } from './cip8-sign-data';

import type { WithCardanoKeyAgent$ } from './cardano-in-memory-transaction-signer';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from './types';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SignerAuth } from '@lace-contract/signer';
import type { Observable } from 'rxjs';

export interface CardanoInMemoryDataSignerProps {
  withKeyAgent$: WithCardanoKeyAgent$;
  dRepKeyHash$: Observable<Ed25519KeyHashHex>;
  knownAddresses: GroupedAddress[];
  auth: SignerAuth;
}

/**
 * Signs CIP-8 data with an in-memory key agent provided per call by the
 * caller-supplied {@link WithCardanoKeyAgent$}.
 *
 * The DRep public-key hash is pre-derived via {@link CardanoInMemoryDataSignerProps.dRepKeyHash$}
 * so CIP-95 sign-data requests targeting the wallet's DRep enterprise address
 * route to role 3, index 0 instead of falling back to payment key 0 (LW-14940).
 */
export class CardanoInMemoryDataSigner implements CardanoDataSigner {
  readonly #props: CardanoInMemoryDataSignerProps;

  public constructor(props: CardanoInMemoryDataSignerProps) {
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
        return this.#props.dRepKeyHash$.pipe(
          switchMap(dRepKeyHash =>
            this.#props.withKeyAgent$(keyAgent =>
              from(
                cip8SignData({
                  keyAgent,
                  request,
                  knownAddresses: this.#props.knownAddresses,
                  dRepKeyHash,
                }),
              ),
            ),
          ),
        );
      }),
    );
  }
}
