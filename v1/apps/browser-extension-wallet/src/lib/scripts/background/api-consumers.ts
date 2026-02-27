import {
  RemoteAuthenticator,
  RemoteAuthenticatorMethod,
  ApiError,
  DataSignError,
  PaginateError,
  TxSendError,
  TxSignError,
  WalletApi,
  WalletApiMethodNames
} from '@cardano-sdk/dapp-connector';
import { Shutdown } from '@cardano-sdk/util';
import {
  consumeRemoteApi,
  MessengerDependencies,
  RemoteApiProperties,
  RemoteApiPropertyType
} from '@cardano-sdk/web-extension';
import fromPairs from 'lodash/fromPairs';

export const RemoteAuthenticatorMethodNames: Array<RemoteAuthenticatorMethod> = [
  'haveAccess',
  'requestAccess',
  'revokeAccess'
];

export interface RemoteAuthenticatorApiProps {
  walletName: string;
  lazy?: boolean;
}

export interface ConsumeRemoteWalletApiProps {
  walletName: string;
  lazy?: boolean;
}

const authenticatorChannel = (walletName: string) => `authenticator-${walletName}`;
const walletApiChannel = (walletName: string) => `wallet-api-${walletName}`;

const cip30errorTypes = [ApiError, DataSignError, PaginateError, TxSendError, TxSignError];

// copied from sdk
export const consumeRemoteAuthenticatorApi = (
  { walletName, lazy }: RemoteAuthenticatorApiProps,
  dependencies: MessengerDependencies
): RemoteAuthenticator & Shutdown =>
  consumeRemoteApi<RemoteAuthenticator>(
    {
      baseChannel: authenticatorChannel(walletName),
      lazy,
      properties: fromPairs(
        RemoteAuthenticatorMethodNames.map((prop) => [prop, RemoteApiPropertyType.MethodReturningPromise])
      ) as RemoteApiProperties<RemoteAuthenticator>
    },
    dependencies
  );

// copied from sdk
export const consumeRemoteWalletApi = (
  { walletName, lazy }: ConsumeRemoteWalletApiProps,
  dependencies: MessengerDependencies
): WalletApi =>
  consumeRemoteApi(
    {
      baseChannel: walletApiChannel(walletName),
      lazy,
      errorTypes: cip30errorTypes,
      properties: fromPairs(
        WalletApiMethodNames.map((prop) => [prop, RemoteApiPropertyType.MethodReturningPromise])
      ) as RemoteApiProperties<WalletApi>
    },
    dependencies
  );
