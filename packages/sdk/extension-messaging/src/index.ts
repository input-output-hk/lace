import {
  createBackgroundMessenger,
  generalizeBackgroundMessenger,
} from './BackgroundMessenger';
import { createNonBackgroundMessenger } from './NonBackgroundMessenger';
import { consumeMessengerRemoteApi, exposeMessengerApi } from './remoteApi';
import { FinalizationRegistryDestructor } from './util';

import type { BackgroundMessenger } from './BackgroundMessenger';
import type {
  ConsumeRemoteApiOptions,
  ExposeApiProps,
  Messenger,
  MessengerDependencies,
} from './types';
import type { ChannelName } from './value-objects';
import type { Shutdown } from '@lace-sdk/util';

export * from './BackgroundMessenger';
export * from './NonBackgroundMessenger';
export * from './remoteApi';
export * from './runContentScriptMessageProxy';
export * from './types';
export * from './util';
export * from './createInjectedRuntime';
export * from './errors';
export * from './value-objects';

export type BaseChannel = { baseChannel: ChannelName };

type ShutdownWithMessenger = Shutdown & { messenger: Messenger };

const isInBackgroundProcess = typeof window === 'undefined';

export const getBackgroundMessenger = (() => {
  let backgroundMessenger: BackgroundMessenger | null = null;
  return (dependencies: MessengerDependencies) =>
    (backgroundMessenger ||= createBackgroundMessenger(dependencies));
})();

const _backgroundExposeApi = <T extends object>(
  props: BaseChannel & ExposeApiProps<T>,
  dependencies: MessengerDependencies,
): ShutdownWithMessenger => {
  const messenger = generalizeBackgroundMessenger(
    props.baseChannel,
    getBackgroundMessenger(dependencies),
    dependencies.logger,
  );
  const shutdown = exposeMessengerApi(props, {
    messenger,
    ...dependencies,
  });

  (shutdown as ShutdownWithMessenger).messenger = messenger;
  return shutdown as ShutdownWithMessenger;
};

export type ExposeApi = typeof _backgroundExposeApi;

const _nonBackgroundExposeApi: ExposeApi = <T extends object>(
  props: BaseChannel & ExposeApiProps<T>,
  dependencies: MessengerDependencies,
): ShutdownWithMessenger => {
  const messenger = createNonBackgroundMessenger(props, dependencies);
  const shutdown = exposeMessengerApi(props, {
    messenger,
    ...dependencies,
  });
  (shutdown as ShutdownWithMessenger).messenger = messenger;
  return shutdown as ShutdownWithMessenger;
};

const _nonBackgroundConsumeRemoteApi = <T extends object>(
  props: BaseChannel & ConsumeRemoteApiOptions<T>,
  dependencies: MessengerDependencies,
) =>
  consumeMessengerRemoteApi(props, {
    destructor: new FinalizationRegistryDestructor(dependencies.logger),
    messenger: createNonBackgroundMessenger(
      { baseChannel: props.baseChannel, lazy: props.lazy },
      dependencies,
    ),
    ...dependencies,
  });

export type ConsumeApi = typeof _nonBackgroundConsumeRemoteApi;

const _backgroundConsumeRemoteApi: ConsumeApi = <T extends object>(
  props: BaseChannel & ConsumeRemoteApiOptions<T>,
  dependencies: MessengerDependencies,
) => {
  const messenger = generalizeBackgroundMessenger(
    props.baseChannel,
    getBackgroundMessenger(dependencies),
    dependencies.logger,
  );
  return consumeMessengerRemoteApi(props, {
    destructor: new FinalizationRegistryDestructor(dependencies.logger),
    messenger,
    ...dependencies,
  });
};

/**
 * Bind an API object to handle messages from other parts of extension.
 * Only compatible with interfaces where all members are either:
 * - Methods that return a Promise
 * - Observable
 *
 * This can only used once per channelName per process.
 */
export const exposeApi: ExposeApi = isInBackgroundProcess
  ? _backgroundExposeApi
  : _nonBackgroundExposeApi;

/**
 * Create a client to remote api, exposed via `exposeApi`.
 * Only compatible with interfaces where all members are either:
 * - Methods that return a Promise
 * - Observable
 */
export const consumeRemoteApi: ConsumeApi = isInBackgroundProcess
  ? _backgroundConsumeRemoteApi
  : _nonBackgroundConsumeRemoteApi;
