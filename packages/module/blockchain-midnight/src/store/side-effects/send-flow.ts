import {
  getAddressType,
  isDustAddress,
  isMidnightToken,
  isShieldedAddress,
  isUnshieldedAddress,
  isValidMidnightAddress,
} from '@lace-contract/midnight-context';
import { None, Some } from '@lace-sdk/util';
import { of, switchMap } from 'rxjs';

import { onAddressValidationRequest } from '../../exported-modules/address-validator';
import { onGetTransactionAnalyticsPayloadRequest } from '../../exported-modules/send-flow-analytics-enhancer';

import type { SideEffect } from '../../';
import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { AddressError } from '@lace-contract/send-flow';
import type { Option } from '@lace-sdk/util';

type ValidateAddressParams = Parameters<
  Parameters<typeof onAddressValidationRequest>[0]
>[0] & {
  networkId: MidnightSDKNetworkId;
};

const validateAddress = ({
  address,
  blockchainSpecificSendFlowData: { flowType },
  networkId,
  token,
}: ValidateAddressParams): Option<AddressError> => {
  if (flowType === 'dust-designation') {
    return isDustAddress(address, networkId)
      ? None
      : Some('designation-flow.form.address-error' as const);
  }

  if (!token)
    return isValidMidnightAddress(address, networkId)
      ? None
      : Some('invalid' as const);

  if (!isMidnightToken(token)) {
    return Some('invalid' as const);
  }

  if (token.metadata?.blockchainSpecific.kind === 'shielded') {
    return isShieldedAddress(address, networkId)
      ? None
      : Some('send-flow.midnight.form.errors.address-shield.invalid' as const);
  }

  return isUnshieldedAddress(address, networkId)
    ? None
    : Some('send-flow.midnight.form.errors.address-unshield.invalid' as const);
};

export const sendFlowAddressValidation: SideEffect = (
  _,
  { midnightContext: { selectNetworkId$ } },
) =>
  selectNetworkId$.pipe(
    switchMap(networkId =>
      onAddressValidationRequest(params =>
        of(
          validateAddress({
            networkId,
            ...params,
          }),
        ),
      ),
    ),
  );

export const sendFlowAnalyticsEnhancer: SideEffect = (
  _,
  { midnightContext: { selectNetworkId$ } },
) =>
  selectNetworkId$.pipe(
    switchMap(networkId =>
      onGetTransactionAnalyticsPayloadRequest(({ address }) => {
        try {
          return of({
            transactionType: getAddressType(address, networkId),
          });
        } catch {
          return of(undefined);
        }
      }),
    ),
  );
