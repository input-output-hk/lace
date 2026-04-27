import { RemoteApiPropertyType } from '@lace-sdk/extension-messaging';

import type { RemoteAuthenticator, RemoteAuthenticatorMethod } from '.';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';

export const RemoteAuthenticatorMethodNames: Array<RemoteAuthenticatorMethod> =
  ['haveAccess', 'requestAccess'];

export const authenticatorApiProperties = Object.fromEntries(
  RemoteAuthenticatorMethodNames.map(property => [
    property,
    RemoteApiPropertyType.MethodReturningPromise,
  ]),
) as RemoteApiProperties<RemoteAuthenticator>;
