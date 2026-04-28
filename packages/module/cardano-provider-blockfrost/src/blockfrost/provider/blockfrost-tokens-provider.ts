import { TokenId } from '@lace-contract/tokens';
import { isNotFoundError } from '@lace-lib/util-provider';
import { BigNumber, Err, Ok, type Result } from '@lace-sdk/util';
import { from, type Observable } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { ProviderError } from '@cardano-sdk/core';
import type { GetTokensProps } from '@lace-contract/cardano-context';
import type { RawTokenWithoutContext } from '@lace-contract/tokens';

const amountToRawToken = (
  amount: Responses['address_content']['amount'][0],
): RawTokenWithoutContext => ({
  available: BigNumber(BigInt(amount.quantity)),
  pending: BigNumber(0n),
  tokenId: TokenId(amount.unit),
});

export class BlockfrostTokensProvider extends BlockfrostProvider {
  public getTokens(
    props: GetTokensProps,
  ): Observable<Result<RawTokenWithoutContext[], ProviderError>> {
    return from(
      this.request<Responses['address_content']>(`addresses/${props.address}`)
        .then(
          ({ amount }): Ok<RawTokenWithoutContext[]> =>
            Ok(amount.map(amountToRawToken)),
        )
        .catch(error => {
          if (isNotFoundError(error)) {
            return Ok([]);
          }
          return Err(error as ProviderError);
        }),
    );
  }
}
