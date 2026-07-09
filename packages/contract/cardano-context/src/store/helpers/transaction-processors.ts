import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import type {
  CardanoProvider,
  CardanoTokenMetadata,
  ExtendedTxDetails,
  RequiredProtocolParameters,
} from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { Activity } from '@lace-contract/activities';
import type { TokenId } from '@lace-contract/tokens';
import type { TokenMetadata } from '@lace-contract/tokens';
import type { Result } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

export type ResolveInputWrapper = (
  txIn: Cardano.TxIn,
) => Promise<Cardano.TxOut | null>;

export type GetTokenMetadataWrapper = (
  tokenId: TokenId,
) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, Error>>;

export type TransactionProcessorParams = {
  activity: Activity;
  txDetails: ExtendedTxDetails;
  accountPaymentAddresses: Cardano.PaymentAddress[];
  protocolParameters: RequiredProtocolParameters;
  rewardAccount: Cardano.RewardAccount;
  inputResolver: Cardano.InputResolver;
  getTokenMetadata: (
    params: { tokenId: TokenId },
    context: { chainId: Cardano.ChainId },
  ) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, Error>>;
  chainId: Cardano.ChainId;
  logger: Logger;
};

/**
 * Wraps `resolveInput` calls with exponential backoff retry. After retries
 * are exhausted the resolver falls back to `null` (the previous silent
 * behavior).
 */
export const createInputResolver = (
  resolveInput: CardanoProvider['resolveInput'],
  chainId: Cardano.ChainId,
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn) =>
    firstValueFrom(
      resolveInput(txIn, { chainId }).pipe(
        map(result => {
          if (result.isErr()) throw result.unwrapErr();
          return result.unwrap();
        }),
        retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
        catchError(() => of<Cardano.TxOut | null>(null)),
      ),
    ),
});

export const createGetTokenMetadataWrapper = (
  getTokenMetadata: (
    params: { tokenId: TokenId },
    context: { chainId: Cardano.ChainId },
  ) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, Error>>,
  chainId: Cardano.ChainId,
): GetTokenMetadataWrapper => {
  return (tokenId: TokenId) => getTokenMetadata({ tokenId }, { chainId });
};
