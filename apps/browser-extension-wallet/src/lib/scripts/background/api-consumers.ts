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
import { Shutdown, GetErrorPrototype } from '@cardano-sdk/util';
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
}

export interface ConsumeRemoteWalletApiProps {
  walletName: string;
}

const authenticatorChannel = (walletName: string) => `authenticator-${walletName}`;
const walletApiChannel = (walletName: string) => `wallet-api-${walletName}`;

const cip30errorTypes = [ApiError, DataSignError, PaginateError, TxSendError, TxSignError];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorPrototype: GetErrorPrototype = (err: any) =>
  cip30errorTypes.find((ErrorType) => ErrorType.prototype.name === err.name)?.prototype || Error.prototype;

// copied from sdk
export const consumeRemoteAuthenticatorApi = (
  { walletName }: RemoteAuthenticatorApiProps,
  dependencies: MessengerDependencies
): RemoteAuthenticator & Shutdown =>
  consumeRemoteApi<RemoteAuthenticator>(
    {
      baseChannel: authenticatorChannel(walletName),
      properties: fromPairs(
        RemoteAuthenticatorMethodNames.map((prop) => [prop, RemoteApiPropertyType.MethodReturningPromise])
      ) as RemoteApiProperties<RemoteAuthenticator>
    },
    dependencies
  );

// copied from sdk
export const consumeRemoteWalletApi = (
  { walletName }: ConsumeRemoteWalletApiProps,
  dependencies: MessengerDependencies
): WalletApi =>
  consumeRemoteApi(
    {
      baseChannel: walletApiChannel(walletName),
      getErrorPrototype,
      properties: fromPairs(
        WalletApiMethodNames.map((prop) => [prop, RemoteApiPropertyType.MethodReturningPromise])
      ) as RemoteApiProperties<WalletApi>
    },
    dependencies
  );
