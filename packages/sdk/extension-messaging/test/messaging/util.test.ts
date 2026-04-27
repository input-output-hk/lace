import { describe, expect, it } from 'vitest';

import {
  isCompletionMessage,
  isEmitMessage,
  isRequest,
  isRequestMessage,
  isResponseMessage,
  namespacedMethod,
  newMessageId,
  tryParseNamespacedMethod,
} from '../../src';

import type {
  CompletionMessage,
  EmitMessage,
  MethodRequest,
  RequestMessage,
  ResponseMessage,
} from '../../src';

describe('messaging/util', () => {
  const validRequest: MethodRequest = { args: ['arg'], method: 'method' };
  describe('isRequest', () => {
    it('returns true for objects matching MethodRequest type', () => {
      expect(isRequest(validRequest)).toBe(true);
    });
    it('returns false for objects not matching MethodRequest type', () => {
      expect(isRequest(null)).toBe(false);
      expect(isRequest({ method: 'method', noArgs: true })).toBe(false);
    });
  });
  describe('isRequestMessage', () => {
    it('returns true for objects matching MethodRequestMessage type', () => {
      expect(
        isRequestMessage({
          messageId: 'messageId',
          request: validRequest,
        } as RequestMessage),
      ).toBe(true);
    });
    it('returns false for objects not matching MethodRequestMessage type', () => {
      expect(isRequestMessage(null)).toBe(false);
      expect(isRequestMessage({ messageId: 'messageId' })).toBe(false);
      expect(isRequestMessage({ request: validRequest })).toBe(false);
    });
  });
  describe('isResponseMessage', () => {
    it('returns true for objects matching ResponseMessage type', () => {
      expect(
        isResponseMessage({
          messageId: 'messageId',
          response: null,
        } as ResponseMessage),
      ).toBe(true);
      expect(
        isResponseMessage({
          messageId: 'messageId',
          response: true,
        } as ResponseMessage),
      ).toBe(true);
    });
    it('returns false for objects not matching ResponseMessage type', () => {
      expect(isResponseMessage(null)).toBe(false);
      expect(isResponseMessage({ messageId: 'messageId' })).toBe(false);
      expect(isResponseMessage({ response: true })).toBe(false);
    });
  });
  describe('isObservableCompletionMessage', () => {
    it('returns true for objects matching SubscriptionMessage type', () => {
      expect(
        isCompletionMessage({
          messageId: 'messageId',
          subscribe: false,
        } as CompletionMessage),
      ).toBe(true);
    });
    it('returns false for objects not matching SubscriptionMessage type', () => {
      expect(isCompletionMessage(null)).toBe(false);
      expect(isCompletionMessage({ messageId: 'messageId' })).toBe(false);
      expect(isCompletionMessage({ subscribe: true })).toBe(false);
    });
  });
  describe('isEmitMessage', () => {
    it('returns true for objects matching EmitMessage type', () => {
      expect(
        isEmitMessage({ emit: null, messageId: 'messageId' } as EmitMessage),
      ).toBe(true);
      expect(
        isEmitMessage({
          emit: 'message',
          messageId: 'messageId',
        } as EmitMessage),
      ).toBe(true);
    });
    it('returns false for objects not matching EmitMessage type', () => {
      expect(isEmitMessage(null)).toBe(false);
      expect(isEmitMessage({ messageId: 'messageId' })).toBe(false);
      expect(isEmitMessage({ emit: true })).toBe(false);
    });
  });
  describe('messageId', () => {
    it('returns a different random ID on each call', () => {
      expect(newMessageId()).not.toEqual(newMessageId());
    });
  });
  describe('namespacedMethod/tryParseNamespacedMethod', () => {
    it('tryParseNamespacedMethod can parse the result of namespacedMethod', () => {
      const namespaced = namespacedMethod('namespace', 'method');
      expect(typeof namespaced).toBe('string');

      const parsed = tryParseNamespacedMethod(namespaced);
      expect(parsed?.namespace).toBe('namespace');
      expect(parsed?.method).toBe('method');
    });
    it('tryParseNamespacedMethod returns undefined for invalid format input', () => {
      expect(tryParseNamespacedMethod('method')).toBeUndefined();
    });
  });
});
