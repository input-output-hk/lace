import { TokenId, type Token } from '@lace-contract/tokens';
import { BigNumber, None } from '@lace-sdk/util';
import { of, map, mergeMap } from 'rxjs';

import type {
  AddressError,
  AmountError,
  DefaultAddressError,
  FormData,
  FormValidationResult,
  SendFlowAddressValidator,
} from './types';
import type { Address, AddressAliasResolver } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Option } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

type ValidateAddressParams<
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
> = {
  addressValidator: SendFlowAddressValidator<
    BlockchainSpecificSendFlowData,
    BlockchainSpecificTokenMetadata
  > | null;
  addressAliasResolvers: AddressAliasResolver[];
  blockchainSpecificData: BlockchainSpecificSendFlowData;
  form: FormData;
  network: BlockchainNetworkId;
  logger: Logger;
};

const getAddressErrorMessage = (error: AddressError): TranslationKey => {
  const defaultAddressErrorMessages: Record<
    DefaultAddressError,
    TranslationKey
  > = {
    empty: 'v2.send-flow.form.errors.address.empty',
    invalid: 'v2.send-flow.form.errors.address.invalid',
  };

  if (Object.keys(defaultAddressErrorMessages).includes(error)) {
    return defaultAddressErrorMessages[error as DefaultAddressError];
  }
  return error as TranslationKey;
};

const tryResolveAlias = (
  input: string,
  networkId: BlockchainNetworkId,
  resolvers: AddressAliasResolver[],
): Observable<Option<Address>> => {
  // Find matching resolver via type guard
  for (const resolver of resolvers) {
    if (resolver.looksLikeAlias(input)) {
      return resolver
        .resolveAlias(input, networkId)
        .pipe(map(result => result.map(r => r.resolvedAddress)));
    }
  }
  return of(None);
};

type AddressValidationResult = {
  error?: TranslationKey;
  resolvedAddress?: Address;
};

const validateAddress = <
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
>({
  addressValidator,
  addressAliasResolvers,
  blockchainSpecificData,
  form,
  network,
}: ValidateAddressParams<
  BlockchainSpecificSendFlowData,
  BlockchainSpecificTokenMetadata
>): Observable<AddressValidationResult> => {
  const { address, tokenTransfers } = form;

  if (!address.dirty) return of({});
  if (address.value === '')
    return of({ error: getAddressErrorMessage('empty') });
  if (!addressValidator) return of({});

  return addressValidator
    .validateAddress({
      address: address.value,
      network,
      blockchainSpecificSendFlowData: blockchainSpecificData,
      // TODO: replace with entire tokenTransfers array and adjust midnight validation logic
      token: tokenTransfers[0]?.token
        .value as Token<BlockchainSpecificTokenMetadata>,
    })
    .pipe(
      mergeMap(validationError => {
        if (validationError.isNone()) {
          return of({});
        }
        return tryResolveAlias(
          address.value,
          network,
          addressAliasResolvers,
        ).pipe(
          map((maybeResolvedAddress): AddressValidationResult => {
            if (maybeResolvedAddress.isNone()) {
              return {
                error: getAddressErrorMessage(validationError.unwrap()),
              };
            }

            // NOTE: we trust that if alias resolve resolves, it will be a valid address
            return { resolvedAddress: maybeResolvedAddress.unwrap() };
          }),
        );
      }),
    );
};

type ValidateAmountParams<BlockchainSpecificTokenMetadata = unknown> = {
  amount: BigNumber;
  minimumAmount: BigNumber;
  token: Token<BlockchainSpecificTokenMetadata>;
};

const clampDecimals = (decimals: number): number => {
  if (!Number.isFinite(decimals)) return 0;
  return Math.max(0, Math.min(Math.trunc(decimals), 38));
};

/**
 * Human-readable smallest positive amount for a token (10^-decimals).
 */
export const humanMinimumAmount = (decimals: number) => {
  const d = clampDecimals(decimals);
  return d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`;
};

const validateAmount = <BlockchainSpecificTokenMetadata = unknown>({
  amount,
  minimumAmount,
  token,
}: ValidateAmountParams<BlockchainSpecificTokenMetadata>): AmountError | null => {
  const balance = BigNumber.valueOf(token.available);
  const parsedAmount = BigNumber.valueOf(amount);

  // TODO LW-14767
  const isLovelace = token.tokenId === TokenId('lovelace');
  const minQuantity =
    isLovelace && minimumAmount !== '-1'
      ? BigNumber.valueOf(minimumAmount)
      : 1n;

  if (parsedAmount < minQuantity)
    return {
      error: 'less-than-minimum',
      argument: isLovelace
        ? minimumAmount === '-1'
          ? // three dots for lovelace when minimum amount is not yet initialized
            '...'
          : // convert lovelace to ADA
            // TODO LW-14767
            (Number(minimumAmount) / 1000000).toString()
        : // make token human readable minimum amount from token decimals
          humanMinimumAmount(token.decimals),
    };

  return balance < parsedAmount ? { error: 'insufficient-balance' } : null;
};

type ValidateFormParams<
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
  BlockchainSpecificFormData = unknown,
> = {
  addressValidator: SendFlowAddressValidator<
    BlockchainSpecificSendFlowData,
    BlockchainSpecificTokenMetadata
  > | null;
  addressAliasResolvers: AddressAliasResolver[];
  blockchainSpecificData: BlockchainSpecificSendFlowData;
  form: FormData<BlockchainSpecificTokenMetadata, BlockchainSpecificFormData>;
  minimumAmount: BigNumber;
  network: BlockchainNetworkId;
  logger: Logger;
};

export const validateForm = <
  BlockchainSpecificSendFlowData = unknown,
  BlockchainSpecificTokenMetadata = unknown,
>({
  addressValidator,
  addressAliasResolvers,
  blockchainSpecificData,
  form,
  minimumAmount,
  network,
  logger,
}: ValidateFormParams<
  BlockchainSpecificSendFlowData,
  BlockchainSpecificTokenMetadata
>): Observable<FormValidationResult[]> =>
  validateAddress<
    BlockchainSpecificSendFlowData,
    BlockchainSpecificTokenMetadata
  >({
    addressValidator,
    addressAliasResolvers,
    blockchainSpecificData,
    form,
    network,
    logger,
  }).pipe(
    map(addressValidationResult => {
      const addressError: FormValidationResult = {
        fieldName: 'address',
        resolvedAddress: addressValidationResult.resolvedAddress,
        error: addressValidationResult.error || null,
      };

      const amountErrors: FormValidationResult[] = form.tokenTransfers.map(
        tt => ({
          fieldName: 'tokenTransfers.amount',
          id: tt.token.value.tokenId,
          error: tt.amount.dirty
            ? validateAmount<BlockchainSpecificTokenMetadata>({
                amount: tt.amount.value,
                minimumAmount,
                token: tt.token.value,
              })
            : null,
        }),
      );

      return [addressError, ...amountErrors];
    }),
  );
