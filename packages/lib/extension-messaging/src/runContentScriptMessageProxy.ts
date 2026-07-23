/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
// only tested in ../e2e tests
import { toSerializableObject } from '@cardano-sdk/util';

import { isRequestMessage, tryParseNamespacedMethod } from './util';

import type { PostMessageRequest, PostMessageResponse } from './types';
import type { Logger } from 'ts-log';

type AnyApi = any;

/**
 * Intended to be run in web extension content script.
 * Forwards messages dispatched via window.postMessage from the website to the extension (background page).
 */
export const runContentScriptMessageProxy = (
  apis: Record<string, AnyApi>,
  logger: Logger,
) => {
  const listener = async ({
    data,
    source,
  }: MessageEvent<PostMessageRequest>) => {
    if (source !== window || !isRequestMessage(data)) return;
    logger.debug('[MessageProxy] from window', data);

    const { request, messageId } = data;
    const namespacedRequest = tryParseNamespacedMethod(request.method);
    if (!namespacedRequest) return;
    const api = apis[namespacedRequest.namespace];
    if (!api) return;

    const apiFunction =
      typeof api[namespacedRequest.method] === 'function'
        ? api[namespacedRequest.method]
        : null;
    if (!apiFunction) return;

    let response;
    try {
      response = await apiFunction(...request.args);
    } catch (error) {
      response = error;
    }

    const responseMessage: PostMessageResponse = {
      baseChannelName: namespacedRequest.namespace,
      messageId,
      response: toSerializableObject(response),
    };

    window.postMessage(responseMessage, source.origin);
  };
  window.addEventListener('message', listener);
  return () => {
    window.removeEventListener('message', listener);
  };
};
