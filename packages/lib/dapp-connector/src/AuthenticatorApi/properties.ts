import { RemoteApiPropertyType } from '@lace-lib/extension-messaging';

import type { RemoteAuthenticator, RemoteAuthenticatorMethod } from '.';
import type { RemoteApiProperties } from '@lace-lib/extension-messaging';

export const RemoteAuthenticatorMethodNames: Array<RemoteAuthenticatorMethod> =
  ['haveAccess', 'requestAccess'];

export const authenticatorApiProperties = Object.fromEntries(
  RemoteAuthenticatorMethodNames.map(property => [
    property,
    RemoteApiPropertyType.MethodReturningPromise,
  ]),
) as RemoteApiProperties<RemoteAuthenticator>;
