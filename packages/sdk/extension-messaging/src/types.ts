/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChannelName } from './value-objects/channel-name.vo';
import type { ErrorClass } from '@cardano-sdk/util';
import type { Shutdown } from '@lace-sdk/util';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';
import type { Events, Runtime } from 'webextension-polyfill';

export type MethodRequest<Method extends string = string, Args = unknown[]> = {
  args: Args;
  method: Method;
};

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export interface AnyMessage extends Object {
  messageId: string;
}

export interface RequestMessage extends AnyMessage {
  request: MethodRequest;
}

export interface ResponseMessage<T = unknown> extends AnyMessage {
  response: T;
}

export interface CompletionMessage extends AnyMessage {
  error?: Error;
  subscribe: false;
}

export interface EmitMessage extends AnyMessage {
  emit: unknown;
}

export type SendMethodRequestMessage = <Response = unknown>(
  message: MethodRequest,
) => Promise<Response>;

export interface FactoryCall<Method extends string = string>
  extends MethodRequest<Method> {
  channel: ChannelName;
}

export interface FactoryCallMessage<Method extends string = string>
  extends AnyMessage {
  factoryCall: FactoryCall<Method>;
}

export type MinimalEvent<Callback extends (...args: any[]) => any> = Pick<
  Events.Event<Callback>,
  'addListener' | 'removeListener'
>;

export interface MessengerPort {
  disconnect(): void;
  name: string;
  onDisconnect: MinimalEvent<(port: MessengerPort) => void>;
  onMessage: MinimalEvent<(data: unknown, port: MessengerPort) => void>;
  /**
   * @throws an Error if the port is closed
   */
  postMessage(message: any): void;
  sender?: Runtime.MessageSender;
}

export interface MinimalRuntime {
  connect(connectInfo: Runtime.ConnectConnectInfoType): MessengerPort;
  lastError?: {
    message?: string;
  };
  onConnect: MinimalEvent<(port: MessengerPort) => void>;
}

export interface MessengerDependencies {
  logger: Logger;
  runtime: MinimalRuntime;
}

export type TransformRequest = (
  request: MethodRequest,
  sender?: Runtime.MessageSender,
) => MethodRequest;
export type ValidateRequest = (
  request: MethodRequest,
  sender?: Runtime.MessageSender,
) => Promise<void>;

export interface ReconnectConfig {
  initialDelay: number;
  maxDelay: number;
}

export interface BindRequestHandlerOptions<Response> {
  handler: (
    request: MethodRequest,
    sender?: Runtime.MessageSender,
  ) => Promise<Response>;
}

export type MinimalPort = Pick<MessengerPort, 'postMessage' | 'sender'>;

export interface PortMessage<Data = unknown> {
  data: Data;
  port: MinimalPort;
}

export enum RemoteApiPropertyType {
  /**
   * Methods might throw RemoteApiShutdownError when attempting
   * to call a method on remote api object that was previously shutdown.
   */
  MethodReturningPromise,
  /**
   * Exposing this observable:
   * - subscribes immediately
   * - shares a single underlying subscription for all connections
   * - replays 1 last emitted value upon connection
   */
  HotObservable,
  /** Method that returns a new remote api object (synchronously). Should only be used for methods that cannot throw. */
  ApiFactory,
}

export interface MethodRequestOptions {
  transform?: TransformRequest;
  validate?: ValidateRequest;
}

export interface RemoteApiMethod {
  propType: RemoteApiPropertyType.MethodReturningPromise;
  requestOptions: MethodRequestOptions;
}

export interface ApiFactoryOptions {
  baseChannel: ChannelName;
}

export interface RemoteApiFactory<T> {
  getApiProperties: () => T extends (...args: any) => any
    ? RemoteApiProperties<ReturnType<T>>
    : never;
  propType: RemoteApiPropertyType.ApiFactory;
}

export type RemoteApiProperty<T> =
  | RemoteApiFactory<T>
  | RemoteApiMethod
  | RemoteApiPropertyType.HotObservable
  | RemoteApiPropertyType.MethodReturningPromise;

export type ExposableRemoteApi<T> = Omit<T, 'shutdown'>;

export type RemoteApiProperties<T> = {
  [key in keyof ExposableRemoteApi<T>]:
    | Omit<RemoteApiProperties<T[key]>, 'propType' | 'requestOptions'>
    | RemoteApiProperty<T[key]>;
};

export interface ExposeApiProps<API extends object> {
  api$: Observable<API | null>;
  properties: RemoteApiProperties<API>;
}

export interface ConsumeRemoteApiOptions<T> {
  errorTypes?: ErrorClass[];
  /**
   * When true, defers runtime.connect() until the first actual use (e.g., method call).
   * Useful for content scripts to avoid waking the Service Worker on every webpage.
   */
  lazy?: boolean;
  properties: RemoteApiProperties<T>;
}

export interface DeriveChannelOptions {
  /** If true, shutting down base messenger will not shut down the derived messenger */
  detached?: boolean;
}

export interface DisconnectEvent {
  disconnected: MinimalPort;
  remaining: MinimalPort[];
}

export interface Messenger extends Shutdown {
  channel: ChannelName;
  connect$: Observable<MinimalPort>;
  deriveChannel(path: string, options?: DeriveChannelOptions): Messenger;
  disconnect$: Observable<DisconnectEvent>;
  isShutdown: boolean;
  message$: Observable<PortMessage>;
  postMessage(message: unknown): Observable<void>;
}

export interface MessengerApiDependencies {
  logger: Logger;
  messenger: Messenger;
}

export interface Destructor {
  onGarbageCollected(
    object: object,
    objectId: unknown,
    callback: () => void,
  ): void;
}

export interface ConsumeMessengerApiDependencies
  extends MessengerApiDependencies {
  destructor: Destructor;
}

export type InternalMsgType = 'apiObjDisabled';
export type InternalMsg = { remoteApiInternalMsg: InternalMsgType };

export type PostMessageRequest = RequestMessage & {
  baseChannelName: string;
};

export type PostMessageResponse = ResponseMessage & {
  baseChannelName: string;
};
