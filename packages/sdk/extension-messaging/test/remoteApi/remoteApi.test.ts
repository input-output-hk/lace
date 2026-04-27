import { EMPTY, Subject, map, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RemoteApiPropertyType,
  bindFactoryMethods,
  exposeMessengerApi,
} from '../../src';
import { ChannelName } from '../../src';

import type {
  FactoryCallMessage,
  Messenger,
  MinimalPort,
  PortMessage,
  RemoteApiProperties,
  RequestMessage,
} from '../../src';
import type { Observable } from 'rxjs';
import type { Mock } from 'vitest';

const logger = dummyLogger;

enum ApiObjectType {
  nested = 'nested',
  simple = 'simple',
}

type SimpleApi = {
  someFactory: () => {
    somePromiseMethod: () => Promise<number>;
  };
  someNumbers$: Observable<number>;
  somePromiseMethod: () => Promise<number>;
};

type TestMessenger = Messenger & { connect(): void };

type MockMessengerResult = {
  messenger: TestMessenger;
  messageSubject: Subject<PortMessage<unknown>>;
  derivedMessengers: Array<DerivedMessenger>;
};

type DerivedMessenger = {
  detached?: boolean;
  messengerResult: MockMessengerResult;
};

const createMockMessenger = (channel: ChannelName): MockMessengerResult => {
  const derivedMessengers = [] as Array<DerivedMessenger>;
  const messageSubject = new Subject<PortMessage<unknown>>();
  const connect$ = new Subject<MinimalPort>();
  let isShutdown = false;

  const messenger: TestMessenger = {
    channel,
    connect$: connect$.asObservable(),
    connect: vi.fn(),
    deriveChannel: vi
      .fn()
      .mockImplementation(
        (
          derivedChannel,
          { detached }: { detached?: boolean | undefined } = {},
        ) => {
          const result = createMockMessenger(
            ChannelName(`${channel}-${derivedChannel}`),
          );
          derivedMessengers.push({ detached, messengerResult: result });
          return result.messenger;
        },
      ),
    disconnect$: EMPTY,
    get isShutdown() {
      return isShutdown;
    },
    message$: messageSubject.asObservable(),
    postMessage: vi.fn().mockImplementation(() => of(undefined)),
    shutdown: vi.fn().mockImplementation(() => {
      isShutdown = true;
      messageSubject.complete();
      connect$.complete();
      for (const { messengerResult, detached } of derivedMessengers) {
        if (!detached) {
          (messengerResult.messenger as unknown as TestMessenger).shutdown();
        }
      }
    }),
  };

  return {
    derivedMessengers,
    messageSubject,
    messenger,
  };
};

// TODO: refactor to use createMockMessenger
const setUp = (mode: ApiObjectType) => {
  const observablePropertyResult = createMockMessenger(
    ChannelName('mockMessenger-someNumbers$'),
  );
  const mockMessengerResult = createMockMessenger(ChannelName('mockMessenger'));
  const mockMessengerOuterResult = createMockMessenger(
    ChannelName('mockMessengerOuter'),
  );

  mockMessengerResult.messenger.deriveChannel = vi
    .fn()
    .mockImplementation(() => observablePropertyResult.messenger);
  mockMessengerOuterResult.messenger.deriveChannel = vi
    .fn()
    .mockImplementation(() => mockMessengerResult.messenger);

  const properties: RemoteApiProperties<SimpleApi> = {
    someFactory: {
      getApiProperties: () => ({
        somePromiseMethod: RemoteApiPropertyType.MethodReturningPromise,
      }),
      propType: RemoteApiPropertyType.ApiFactory,
    },
    someNumbers$: RemoteApiPropertyType.HotObservable,
    somePromiseMethod: RemoteApiPropertyType.MethodReturningPromise,
  };
  const apiSource$ = new Subject<SimpleApi | null>();

  const someNumbers$ = new Subject<number>();
  const someNumbers2$ = new Subject<number>();

  const api: { obj: SimpleApi; sourceNumbers$: Subject<number> }[] = [
    {
      obj: {
        someFactory: vi.fn().mockReturnValue({
          somePromiseMethod: vi.fn().mockResolvedValue(6),
        }),
        someNumbers$,
        somePromiseMethod: vi.fn().mockResolvedValue(5),
      },
      sourceNumbers$: someNumbers$,
    },
    {
      obj: {
        someFactory: vi.fn().mockReturnValueOnce({
          somePromiseMethod: vi.fn().mockResolvedValue(9),
        }),
        someNumbers$: someNumbers2$,
        somePromiseMethod: vi.fn().mockResolvedValue(55),
      },
      sourceNumbers$: someNumbers2$,
    },
  ];

  const hostSubscription =
    mode === ApiObjectType.simple
      ? exposeMessengerApi<SimpleApi>(
          {
            api$: apiSource$,
            properties,
          },
          {
            logger,
            messenger: mockMessengerResult.messenger,
          },
        )
      : exposeMessengerApi<{ innerProps: SimpleApi }>(
          {
            api$: apiSource$.pipe(map(v => (v ? { innerProps: v } : v))),
            properties: { innerProps: properties },
          },
          {
            logger,
            messenger: mockMessengerOuterResult.messenger,
          },
        );

  return {
    api,
    apiSource$,
    hostSubscription,
    incomingMsg$: mockMessengerResult.messageSubject,
    mockMessenger: mockMessengerResult.messenger,
    mockMessengerResult,
    observablePropMessenger: observablePropertyResult.messenger,
    observablePropertyResult,
    shutdown: () => {
      hostSubscription.shutdown();
      apiSource$.complete();
      mockMessengerResult.messageSubject.complete();
      someNumbers$.complete();
      someNumbers2$.complete();
    },
  };
};

describe('remoteApi', () => {
  describe.each([ApiObjectType.simple, ApiObjectType.nested])(
    '[%s] exposeMessengerApi',
    mode => {
      let sut: ReturnType<typeof setUp>;
      let postMessage: Mock;

      beforeEach(() => {
        postMessage = vi.fn();
        sut = setUp(mode);
      });

      afterEach(() => {
        sut.shutdown();
      });

      describe('no api emitted yet', () => {
        it('creates messenger object for HotObservable property', () => {
          expect(sut.mockMessenger.deriveChannel).toHaveBeenCalledWith(
            'someNumbers$',
          );
        });

        it('subscribes SimpleApi observable source', () => {
          expect(sut.apiSource$.observed).toBe(true);
        });

        it('unsubscribes SimpleApi observable source and sends unsubscribe message on shutdown', () => {
          sut.hostSubscription.shutdown();
          expect(sut.observablePropMessenger.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ subscribe: false }),
          );
          expect(sut.apiSource$.observed).toBe(false);
        });

        it('does NOT send unsubscribe messages when SimpleApi observable completes', () => {
          sut.apiSource$.complete();
          expect(
            sut.observablePropMessenger.postMessage,
          ).not.toHaveBeenCalled();
          expect(sut.mockMessengerResult.messageSubject.observed).toBe(true);
        });
      });

      describe('api objects emitted', () => {
        beforeEach(() => {
          sut.apiSource$.next(sut.api[0].obj);
        });

        it('does NOT send unsubscribe messages when api property completes', () => {
          sut.api[0].sourceNumbers$.complete();
          expect(
            sut.observablePropMessenger.postMessage,
          ).not.toHaveBeenCalled();
        });

        it('unsubscribes api object properties on shutdown', () => {
          sut.hostSubscription.shutdown();
          expect(sut.api[0].sourceNumbers$.observed).toBe(false);
        });

        it('subscribes to api object properties emitted by apiSource$', () => {
          expect(sut.api[0].sourceNumbers$.observed).toBe(true);
        });

        it('mirrors api observable properties on property messenger channel ', () => {
          sut.api[0].sourceNumbers$.next(1);
          expect(sut.observablePropMessenger.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ emit: 1 }),
          );
        });

        it('mirrors values from new api objects and unsubscribes prev api', () => {
          sut.apiSource$.next(sut.api[1].obj);
          sut.api[1].sourceNumbers$.next(2);
          expect(sut.api[0].sourceNumbers$.observed).toBe(false);
          expect(sut.observablePropMessenger.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ emit: 2 }),
          );
        });

        it('null api unsubscribes observable channels', () => {
          sut.apiSource$.next(null);
          expect(sut.api[0].sourceNumbers$.observed).toBe(false);
        });
      });

      describe('bindFactoryMethods', () => {
        describe('factory invocations create "detached" API objects', () => {
          it('does not shut down returned API objects when the factory is shut down', async () => {
            await new Promise<void>(done => {
              const factoryMessengerResult = createMockMessenger(
                ChannelName('pingPong'),
              );
              const factory = bindFactoryMethods(
                {
                  api$: of({
                    pingApi: () => ({
                      ping: async () => 'pong',
                    }),
                  }),
                  properties: {
                    pingApi: {
                      getApiProperties: () => ({
                        ping: RemoteApiPropertyType.MethodReturningPromise,
                      }),
                      propType: RemoteApiPropertyType.ApiFactory,
                    },
                  },
                },
                {
                  logger,
                  messenger: factoryMessengerResult.messenger,
                },
              );
              factoryMessengerResult.messageSubject.next({
                data: {
                  factoryCall: {
                    args: [],
                    channel: ChannelName('pingApi-1'),
                    method: 'pingApi',
                  },
                  messageId: '1',
                } as FactoryCallMessage,
                port: {} as MinimalPort,
              });
              factory.shutdown();
              expect(factoryMessengerResult.derivedMessengers.length).toBe(1);
              expect(factoryMessengerResult.derivedMessengers[0].detached).toBe(
                true,
              );
              expect(
                factoryMessengerResult.derivedMessengers[0].messengerResult
                  .messenger.isShutdown,
              ).toBe(false);
              expect(
                factoryMessengerResult.derivedMessengers[0].messengerResult
                  .messenger.postMessage,
              ).not.toBeCalled();
              const pingMessengerResult =
                factoryMessengerResult.derivedMessengers[0].messengerResult;
              pingMessengerResult.messageSubject.next({
                data: {
                  messageId: '2',
                  request: {
                    args: [],
                    method: 'ping',
                  },
                } as RequestMessage,
                port: {} as MinimalPort,
              });
              setTimeout(() => {
                expect(
                  pingMessengerResult.messenger.postMessage,
                ).toBeCalledTimes(1);
                done();
              });
            });
          });
        });

        it('each factory call exposes a new api object', async () => {
          await new Promise<void>(done => {
            const activate1: FactoryCallMessage = {
              factoryCall: {
                args: [],
                channel: ChannelName('channel1'),
                method: 'someFactory',
              },
              messageId: 'call1',
            };
            const activate2: FactoryCallMessage = {
              factoryCall: {
                args: [],
                channel: ChannelName('channel2'),
                method: 'someFactory',
              },
              messageId: 'call2',
            };
            sut.apiSource$.next(sut.api[0].obj);
            sut.incomingMsg$.next({ data: activate1, port: { postMessage } });
            sut.incomingMsg$.next({ data: activate2, port: { postMessage } });
            setTimeout(() => {
              expect(sut.api[0].obj.someFactory).toHaveBeenCalledTimes(2);
              expect(sut.mockMessenger.deriveChannel).toHaveBeenCalledTimes(3);
              done();
            });
          });
        });
      });

      describe('MethodReturningPromise', () => {
        it('monitors requests', () => {
          expect(sut.mockMessengerResult.messageSubject.observed).toBe(true);
        });

        it('stops mirroring requests on shutdown', () => {
          sut.hostSubscription.shutdown();
          expect(sut.mockMessengerResult.messageSubject.observed).toBe(false);
        });

        it('ignores requests that are not valid', () => {
          sut.incomingMsg$.next({ data: {}, port: { postMessage } });
          expect(sut.mockMessenger.postMessage).not.toHaveBeenCalled();
        });

        it('mirrors requests to method returning promise only after an api object is emitted', async () => {
          await new Promise<void>(done => {
            const request: RequestMessage = {
              messageId: 'abc',
              request: { args: [], method: 'somePromiseMethod' },
            };
            sut.incomingMsg$.next({ data: request, port: { postMessage } });
            expect(sut.api[0].obj.somePromiseMethod).not.toHaveBeenCalled();
            sut.apiSource$.next(sut.api[0].obj);
            setTimeout(() => {
              expect(sut.api[0].obj.somePromiseMethod).toHaveBeenCalled();
              expect(sut.mockMessenger.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({ response: 5 }),
              );
              done();
            });
          });
        });

        it('mirrors requests to method from new api', async () => {
          await new Promise<void>(done => {
            sut.apiSource$.next(sut.api[1].obj);
            const request: RequestMessage = {
              messageId: 'abc',
              request: { args: [], method: 'somePromiseMethod' },
            };
            sut.incomingMsg$.next({ data: request, port: { postMessage } });
            setTimeout(() => {
              expect(sut.mockMessenger.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({ response: 55 }),
              );
              done();
            });
          });
        });

        it('null api makes new promise wait until a new valid api is emitted', async () => {
          await new Promise<void>(done => {
            sut.apiSource$.next(null);
            const request: RequestMessage = {
              messageId: 'abc',
              request: { args: [], method: 'somePromiseMethod' },
            };
            sut.incomingMsg$.next({ data: request, port: { postMessage } });
            setTimeout(() => {
              expect(sut.mockMessenger.postMessage).not.toHaveBeenCalled();
              sut.apiSource$.next(sut.api[0].obj);
              setTimeout(() => {
                expect(sut.mockMessenger.postMessage).toHaveBeenCalledWith(
                  expect.objectContaining({ response: 5 }),
                );
                done();
              });
            });
          });
        });
      });
    },
  );

  describe('consumer', () => {
    it.todo('it handles messages correctly');
  });
});
