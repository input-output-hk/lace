/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import type {
  AnyMessage,
  CompletionMessage,
  Destructor,
  EmitMessage,
  FactoryCall,
  FactoryCallMessage,
  InternalMsg as InternalMessage,
  MethodRequest,
  PostMessageResponse,
  RequestMessage,
  ResponseMessage,
} from './types';
import type { Logger } from 'ts-log';

const isRequestLike = (
  message: any,
): message is MethodRequest & Partial<Record<string, unknown>> =>
  typeof message === 'object' &&
  message !== null &&
  Array.isArray(message.args) &&
  typeof message.method === 'string';

export const isRequest = (message: any): message is MethodRequest =>
  isRequestLike(message) && message.channel === undefined;

export const isFactoryCall = (message: any): message is FactoryCall =>
  isRequestLike(message) && typeof message.channel === 'string';

const looksLikeMessage = (
  message: any,
): message is AnyMessage & Record<string, unknown> =>
  typeof message === 'object' &&
  message !== null &&
  typeof message.messageId === 'string';

export const isRequestMessage = (message: any): message is RequestMessage =>
  looksLikeMessage(message) && isRequest(message.request);

export const isFactoryCallMessage = (
  message: any,
): message is FactoryCallMessage =>
  looksLikeMessage(message) && isFactoryCall(message.factoryCall);

export const isResponseMessage = (message: any): message is ResponseMessage =>
  looksLikeMessage(message) && message.hasOwnProperty('response');

export const isPostMessageResponse = (
  message: any,
): message is PostMessageResponse =>
  isResponseMessage(message) && message.hasOwnProperty('baseChannelName');

export const namespacedMethod = (namespace: string, method: string) =>
  `${namespace}#${method}`;

export const tryParseNamespacedMethod = (maybeNamespacedMethod: string) => {
  const [namespace, method] = maybeNamespacedMethod.split('#');
  if (!method) return;
  return { namespace, method };
};

export const isCompletionMessage = (
  message: any,
): message is CompletionMessage =>
  looksLikeMessage(message) && typeof message.subscribe === 'boolean';

export const isEmitMessage = (message: any): message is EmitMessage =>
  looksLikeMessage(message) && message.hasOwnProperty('emit');

const isInternalMessage = (message: unknown): message is InternalMessage =>
  (message as InternalMessage)?.remoteApiInternalMsg !== undefined;
export const disabledApiMsg: InternalMessage = {
  remoteApiInternalMsg: 'apiObjDisabled',
};
export const isNotDisabledApiMsg = (message: unknown) =>
  !isInternalMessage(message) ||
  message.remoteApiInternalMsg !== disabledApiMsg.remoteApiInternalMsg;

export class FinalizationRegistryDestructor implements Destructor {
  readonly #registry: FinalizationRegistry<unknown>;
  readonly #logger: Logger;
  readonly callbacks: Map<unknown, () => void> = new Map();

  constructor(logger: Logger) {
    this.#registry = new FinalizationRegistry(heldValue => {
      this.#callback(heldValue);
    });
    this.#logger = logger;
  }

  #callback(heldValue: unknown) {
    const callback = this.callbacks.get(heldValue);
    if (!callback) {
      this.#logger.error(
        'heldValue not found in FinalizationRegistryDestructor',
      );
      return;
    }
    this.callbacks.delete(heldValue);
    callback();
  }

  onGarbageCollected(object: object, objectId: unknown, callback: () => void) {
    this.callbacks.set(objectId, callback);
    this.#registry.register(object, objectId);
  }
}

export { v4 as newMessageId } from 'uuid';
