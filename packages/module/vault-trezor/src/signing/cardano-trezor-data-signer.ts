import { NotImplementedError } from '@lace-sdk/util';
import { throwError } from 'rxjs';

import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export class CardanoTrezorDataSigner implements CardanoDataSigner {
  public signData(
    _request: CardanoSignDataRequest,
  ): Observable<CardanoSignDataResult> {
    return throwError(
      () =>
        new NotImplementedError(
          'CIP-8 data signing is not supported on Trezor devices',
        ),
    );
  }
}
