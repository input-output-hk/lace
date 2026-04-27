import { firstValueFrom, map } from 'rxjs';

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

export const createInputResolver = (
  resolveInput: CardanoProvider['resolveInput'],
  chainId: Cardano.ChainId,
): Cardano.InputResolver => ({
  resolveInput: async (txIn: Cardano.TxIn) => {
    return firstValueFrom(
      resolveInput(txIn, { chainId }).pipe(
        // TODO: LW-12636 handle input resolver errors?
        map(result => result.unwrapOr(null)),
      ),
    );
  },
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
