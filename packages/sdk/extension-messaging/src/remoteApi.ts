import {
  fromSerializableObject,
  isPromise,
  toSerializableObject,
} from '@cardano-sdk/util';
import { TrackerSubject } from '@cardano-sdk/util-rxjs';
import { NotImplementedError } from '@lace-sdk/util';
import {
  EMPTY,
  EmptyError,
  NEVER,
  concat,
  filter,
  firstValueFrom,
  from,
  isObservable,
  map,
  merge,
  mergeMap,
  of,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { CustomError } from 'ts-custom-error';
import { v4 as uuidv4 } from 'uuid';

import { WrongTargetError } from './errors';
import { RemoteApiPropertyType } from './types';
import {
  disabledApiMsg as disabledApiMessage,
  isCompletionMessage,
  isEmitMessage,
  isFactoryCallMessage,
  isNotDisabledApiMsg as isNotDisabledApiMessage,
  isRequestMessage,
  isResponseMessage,
  newMessageId,
} from './util';

import type {
  BindRequestHandlerOptions,
  CompletionMessage,
  ConsumeMessengerApiDependencies,
  ConsumeRemoteApiOptions,
  EmitMessage,
  ExposableRemoteApi,
  ExposeApiProps,
  FactoryCallMessage,
  MessengerApiDependencies,
  MethodRequest,
  MethodRequestOptions,
  RemoteApiFactory,
  RemoteApiMethod,
  RemoteApiProperties,
  RequestMessage,
  ResponseMessage,
} from './types';
import type { ErrorClass } from '@cardano-sdk/util';
import type { Shutdown } from '@lace-sdk/util';
import type { Observable, Subscription, TeardownLogic } from 'rxjs';

export class RemoteApiShutdownError extends CustomError {
  constructor(channel: string) {
    super(
      `Remote API with channel '${channel}' was shutdown: object can no longer be used.`,
    );
  }
}

const consumeMethod =
  (
    {
      propName,
      errorTypes,
    }: {
      errorTypes?: ErrorClass[];
      options?: MethodRequestOptions;
      propName: string;
    },
    {
      messenger: { message$, postMessage, channel, disconnect$ },
    }: MessengerApiDependencies,
  ) =>
  async (...args: unknown[]) => {
    const requestMessage: RequestMessage = {
      messageId: newMessageId(),
      request: {
        args: args.map(argument => toSerializableObject(argument)),
        method: propName,
      },
    };

    const result = await firstValueFrom(
      merge(
        postMessage(requestMessage).pipe(mergeMap(() => EMPTY)),
        message$.pipe(
          map(({ data }) =>
            fromSerializableObject(data, {
              errorTypes: [...(errorTypes || []), WrongTargetError],
            }),
          ),
          filter(isResponseMessage),
          filter(({ messageId }) => messageId === requestMessage.messageId),
          map(({ response }) => response),
          filter(response => !(response instanceof WrongTargetError)),
        ),
        disconnect$.pipe(
          filter(dc => dc.remaining.length === 0),
          mergeMap(() => throwError(() => new EmptyError())),
        ),
      ),
    ).catch(error => {
      if (error instanceof EmptyError) {
        throw new RemoteApiShutdownError(channel);
      }
      throw error;
    });

    if (result instanceof Error) {
      throw result;
    }
    return result;
  };

interface ConsumeFactoryProps<T> {
  apiProperties: RemoteApiProperties<T>;
  errorTypes: ErrorClass[] | undefined;
  method: string;
}

const consumeFactory =
  <T>(
    { method, apiProperties, errorTypes }: ConsumeFactoryProps<T>,
    { logger, messenger, destructor }: ConsumeMessengerApiDependencies,
  ) =>
  (...args: unknown[]) => {
    const factoryChannelNo = uuidv4();
    const channel = `${method}-${factoryChannelNo}`;
    const postSubscription = messenger
      .postMessage({
        factoryCall: { args: toSerializableObject(args), channel, method },
        messageId: newMessageId(),
      } as FactoryCallMessage)
      .subscribe();
    const apiMessenger = messenger.deriveChannel(channel, { detached: true });

    const api = consumeMessengerRemoteApi(
      {
        errorTypes,
        properties: apiProperties,
      },
      {
        destructor,
        logger,
        messenger: apiMessenger,
      },
    );
    destructor.onGarbageCollected(api, factoryChannelNo, () => {
      if (apiMessenger.isShutdown) {
        return;
      }
      apiMessenger
        .postMessage({
          messageId: newMessageId(),
          subscribe: false,
        } as CompletionMessage)
        .subscribe(() => {
          postSubscription.unsubscribe();
          apiMessenger.shutdown();
        });
    });

    // Since it returns synchronously, we can't catch potential errors.
    // If factory method throws on the remote side, it might be a good idea to "brick" the returned api object:
    // immediately reject on all method calls and error on observable subscriptions,
    return api;
  };

/** Creates a proxy to a remote api object */
export const consumeMessengerRemoteApi = <T extends object>(
  { properties, errorTypes }: ConsumeRemoteApiOptions<T>,
  { logger, messenger, destructor }: ConsumeMessengerApiDependencies,
): Shutdown & T =>
  new Proxy<Shutdown & T>(
    {
      shutdown: messenger.shutdown,
    } as Shutdown & T,
    {
      get: (target, property, receiver) => {
        if (property in target) {
          return target[property as keyof T];
        }
        const propertyMetadata =
          properties[property as keyof ExposableRemoteApi<T>];
        const propertyName = property.toString();
        if (typeof propertyMetadata === 'object') {
          if ('propType' in propertyMetadata) {
            switch (propertyMetadata.propType) {
              case RemoteApiPropertyType.MethodReturningPromise: {
                const method = consumeMethod(
                  {
                    errorTypes,
                    options: propertyMetadata.requestOptions,
                    propName: propertyName,
                  },
                  { logger, messenger },
                );
                Reflect.set(target, property, method, receiver);
                return method;
              }
              case RemoteApiPropertyType.ApiFactory: {
                const factory = consumeFactory(
                  {
                    apiProperties: propertyMetadata.getApiProperties(),
                    errorTypes,
                    method: propertyName,
                  },
                  { destructor, logger, messenger },
                );
                Reflect.set(target, property, factory, receiver);
                return factory;
              }
            }
          } else {
            const nestedApi = consumeMessengerRemoteApi(
              {
                errorTypes,
                properties: propertyMetadata as RemoteApiProperties<unknown>,
              },
              {
                destructor,
                logger,
                messenger: messenger.deriveChannel(propertyName),
              },
            );
            Reflect.set(target, property, nestedApi, receiver);
            return nestedApi;
          }
        } else if (
          propertyMetadata === RemoteApiPropertyType.MethodReturningPromise
        ) {
          const method = consumeMethod(
            { errorTypes, propName: propertyName },
            { logger, messenger },
          );
          Reflect.set(target, property, method, receiver);
          return method;
        } else if (propertyMetadata === RemoteApiPropertyType.HotObservable) {
          const observableMessenger = messenger.deriveChannel(propertyName);
          const messageData$ = observableMessenger.message$.pipe(
            map(({ data }) => fromSerializableObject(data)),
          );
          const unsubscribe$ = messageData$.pipe(
            filter(isCompletionMessage),
            filter(({ subscribe }) => !subscribe),
            tap(({ error }) => {
              if (error) throw error;
            }),
          );
          const messageData = messageData$.pipe(
            takeUntil(unsubscribe$),
            filter(isEmitMessage),
            map(({ emit }) => emit),
            shareReplay(1),
            filter(isNotDisabledApiMessage), // Do not replay values from an api object that was disabled
          );
          Reflect.set(target, property, messageData, receiver);
          return messageData;
        }
      },
      has: (_, p) => p in properties,
    },
  );

export const bindMessengerRequestHandler = <Response>(
  { handler }: BindRequestHandlerOptions<Response>,
  { logger, messenger: { message$, postMessage } }: MessengerApiDependencies,
): Shutdown => {
  const subscription = message$.subscribe(async ({ data, port }) => {
    if (!isRequestMessage(data)) return;
    let response: Error | Response;
    try {
      const request = fromSerializableObject<MethodRequest>(data.request);
      response = await handler(request, port.sender);
    } catch (error) {
      logger.debug(
        '[MessengerRequestHandler] Error processing message',
        data,
        error,
      );
      response = error instanceof Error ? error : new Error('Unknown error');
    }

    const responseMessage: ResponseMessage = {
      messageId: data.messageId,
      response: toSerializableObject(response),
    };

    postMessage(responseMessage).subscribe();
  });
  return {
    shutdown: () => {
      subscription.unsubscribe();
    },
  };
};

const isObject = (property: unknown) =>
  typeof property === 'object' && property !== null;

const hasPropertyType = (
  property: unknown,
  propertyType: RemoteApiPropertyType,
) =>
  isObject(property) &&
  (property as Record<string, unknown>).propType === propertyType;

const hasAnyPropertyType = (property: unknown) =>
  isObject(property) &&
  typeof (property as Record<string, unknown>).propType === 'number';

const isRemoteApiMethod = (property: unknown): property is RemoteApiMethod =>
  hasPropertyType(property, RemoteApiPropertyType.MethodReturningPromise);

const isRemoteApiFactory = (
  property: unknown,
): property is RemoteApiFactory<unknown> =>
  hasPropertyType(property, RemoteApiPropertyType.ApiFactory);

export const bindNestedObjChannels = <API extends object>(
  { api$, properties }: ExposeApiProps<API>,
  { messenger, logger }: MessengerApiDependencies,
): Shutdown => {
  const subscriptions = Object.entries(properties)
    .filter(
      ([_, type]) => typeof type === 'object' && !hasAnyPropertyType(type),
    )
    .map(([property]) =>
      exposeMessengerApi(
        {
          api$: api$.pipe(
            tap(api => {
              // Do not stop for null api. We must unsubscribe the existing subscriptions from nested props
              if (
                api &&
                (typeof api[property as keyof API] !== 'object' ||
                  isObservable(api[property as keyof API]))
              ) {
                throw new NotImplementedError(
                  `Trying to expose non-implemented nested object ${property}`,
                );
              }
            }),
            map(
              api => (api ? api[property as keyof API] : api) as object | null,
            ),
          ),
          properties: properties[property as keyof RemoteApiProperties<API>],
        },
        { logger, messenger: messenger.deriveChannel(property) },
      ),
    );
  return {
    shutdown: () => {
      for (const subscription of subscriptions) {
        subscription.shutdown();
      }
    },
  };
};

export const bindFactoryMethods = <API extends object>(
  { api$, properties }: ExposeApiProps<API>,
  { messenger, logger }: MessengerApiDependencies,
): Shutdown => {
  const subscription = messenger.message$.subscribe(async ({ data }) => {
    if (!isFactoryCallMessage(data)) return;
    const propertyDefinition =
      properties[data.factoryCall.method as keyof RemoteApiProperties<API>];
    if (!isRemoteApiFactory(propertyDefinition)) {
      logger.warn(
        `Invalid or missing property definition for api factory method '${data.factoryCall.method}'`,
      );
      return;
    }
    try {
      const args = fromSerializableObject<MethodRequest>(data.factoryCall.args);
      const { method, channel } = data.factoryCall;
      const factoryMessenger = messenger.deriveChannel(channel, {
        detached: true,
      });

      const api = exposeMessengerApi(
        {
          api$: api$.pipe(
            switchMap(baseApi => {
              if (!baseApi) return NEVER;
              const apiMethod = baseApi[method as keyof API];
              if (typeof apiMethod !== 'function') {
                logger.warn('No api method', method);
                return EMPTY;
              }
              const returnedApi = apiMethod.apply(baseApi, args) as unknown;
              if (isPromise(returnedApi)) {
                return from(returnedApi as Promise<object>);
              }
              return of(returnedApi as object);
            }),
          ),
          properties: propertyDefinition.getApiProperties(),
        },
        {
          logger,
          messenger: factoryMessenger,
        },
      );
      let completeSubscription: Subscription | null = null;
      const teardown: TeardownLogic = () => {
        completeSubscription?.unsubscribe();
        api.shutdown();
      };
      completeSubscription = factoryMessenger.message$.subscribe(message => {
        if (isCompletionMessage(message.data)) {
          teardown();
        }
      });
    } catch (error) {
      logger.debug('[bindFactoryMethods] error exposing api', data, error);
    }
  });
  return {
    shutdown: () => {
      subscription.unsubscribe();
    },
  };
};

export const bindObservableChannels = <API extends object>(
  { api$, properties }: ExposeApiProps<API>,
  { messenger, logger }: MessengerApiDependencies,
): Shutdown => {
  const subscriptions = Object.entries(properties)
    .filter(
      ([, propertyType]) =>
        propertyType === RemoteApiPropertyType.HotObservable,
    )
    .map(([observableProperty]) => {
      const observable$ = new TrackerSubject(
        api$.pipe(
          tap(api => {
            if (api && !isObservable(api[observableProperty as keyof API])) {
              throw new NotImplementedError(
                `Trying to expose non-implemented observable ${observableProperty}`,
              );
            }
          }),
          // Null api (aka stop using the object).
          // Unsubscribe its properties but leave the wrapping subscription open, waiting for a new api object
          // Send an internal disabledApiMsg to consumerApi, so it stops replaying values from disabled api object
          switchMap(api =>
            api
              ? (api[observableProperty as keyof API] as Observable<unknown>)
              : of(disabledApiMessage),
          ),
        ),
      );

      const observableMessenger = messenger.deriveChannel(observableProperty);
      const connectSubscription = observableMessenger.connect$.subscribe(
        port => {
          if (observable$.value !== TrackerSubject.NO_VALUE) {
            try {
              port.postMessage(
                toSerializableObject({
                  emit: observable$.value,
                  messageId: newMessageId(),
                } as EmitMessage),
              );
            } catch (error) {
              logger.warn(
                'Failed to emit initial value, port immediatelly disconnected?',
                error,
              );
            }
          }
        },
      );
      const broadcastMessage = (
        message: Partial<CompletionMessage | EmitMessage>,
      ) =>
        observableMessenger
          .postMessage({
            messageId: newMessageId(),
            ...(toSerializableObject(message) as object),
          })
          .subscribe();
      const observableSubscription = observable$.subscribe({
        complete: () => broadcastMessage({ subscribe: false }),
        error: (error: Error) => broadcastMessage({ error, subscribe: false }),
        next: (emit: unknown) => broadcastMessage({ emit }),
      });
      return () => {
        observable$.complete();
        connectSubscription.unsubscribe();
        observableSubscription.unsubscribe();
      };
    });
  return {
    shutdown: () => {
      for (const unsubscribe of subscriptions) unsubscribe();
    },
  };
};

/**
 * Bind an API object emitted by `api$` observable to handle messages from other parts of the extension.
 * - This can only used once per channelName per process.
 * - Changing source `api` object is possible by emitting it from the `api$` observable.
 * - Before destroying/disabling an exposed `api` object, emit a `null` on api$ to stop monitoring it.
 * - Methods returning `Promises` will await until the first `api` object is emitted.
 * - Subscriptions to observable properties are kept active until `shutdown()` method is called.
 *   This allows changing the observed `api` object without having to resubscribe the properties.
 * - Observable properties are completed only on calling `shutdown()`.
 *
 * NOTE: All Observables are subscribed when this function is called and an `api` object is emitted by `api$`.
 * Caches and replays (1) last emission upon remote subscription (unless item === null).
 *
 * In addition to errors thrown by the underlying API, methods can throw TypeError
 *
 * @returns object that can be used to shutdown all ports (shuts down 'messenger' dependency)
 */
export const exposeMessengerApi = <API extends object>(
  { api$, properties }: ExposeApiProps<API>,
  dependencies: MessengerApiDependencies,
): Shutdown => {
  // keep apiTracker$ alive even if api$ completes. Only shutdown() can complete it
  const apiTracker$ = new TrackerSubject(concat(api$, NEVER));
  const observableChannelsSubscription = bindObservableChannels(
    { api$: apiTracker$, properties },
    dependencies,
  );
  const nestedObjectChannelsSubscription = bindNestedObjChannels(
    { api$: apiTracker$, properties },
    dependencies,
  );
  const factoryMethodsSubscription = bindFactoryMethods(
    { api$: apiTracker$, properties },
    dependencies,
  );
  const methodHandlerSubscription = bindMessengerRequestHandler(
    {
      handler: async (originalRequest, sender) => {
        const property =
          properties[originalRequest.method as keyof ExposableRemoteApi<API>];
        if (
          property === undefined ||
          (property !== RemoteApiPropertyType.MethodReturningPromise &&
            !isRemoteApiMethod(property))
        ) {
          throw new Error(
            `Attempted to call a method that was not explicitly exposed: ${originalRequest.method}`,
          );
        }
        const {
          validate = async () => void 0,
          transform = request => request,
        } = isRemoteApiMethod(property)
          ? property.requestOptions
          : ({} as MethodRequestOptions);
        await validate(originalRequest, sender);
        const { args, method } = transform(originalRequest, sender);
        // Calling the promise method after `null` api was emitted (aka stop using the object),
        // awaits for a new valid api object.
        const api = await firstValueFrom(apiTracker$.pipe(filter(v => !!v)));
        const apiTarget: unknown = method in api && api[method as keyof API];
        if (typeof apiTarget !== 'function') {
          throw new TypeError(`No such API method: ${method}`);
        }
        return apiTarget.apply(api, args) as Promise<unknown>;
      },
    },
    dependencies,
  );
  return {
    shutdown: () => {
      apiTracker$.complete();
      nestedObjectChannelsSubscription.shutdown();
      factoryMethodsSubscription.shutdown();
      observableChannelsSubscription.shutdown();
      methodHandlerSubscription.shutdown();
      dependencies.messenger.shutdown();
    },
  };
};
