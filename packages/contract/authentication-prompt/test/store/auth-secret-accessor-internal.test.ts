import { ByteArray } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  initializeInternalAuthSecretAccessor,
  sendAuthSecretApi,
} from '../../src/store/auth-secret-accessor-internal';
import { AuthSecret } from '../../src/value-objects';

const makeAuthSecret = (value: string) => AuthSecret(ByteArray.fromUTF8(value));

describe('initializeInternalAuthSecretAccessor', () => {
  describe('exposeInternalAuthSecretApi', () => {
    it('calls exposeInternalAuthSecretApi with the sendAuthSecretApi', () => {
      const exposeInternalAuthSecretApi = vi.fn();
      initializeInternalAuthSecretAccessor({
        exposeInternalAuthSecretApi,
        consumeInternalAuthSecretApi: vi.fn(),
      });

      expect(exposeInternalAuthSecretApi).toHaveBeenCalledWith(
        sendAuthSecretApi,
      );
    });

    it('does not call exposeInternalAuthSecretApi when not provided', () => {
      expect(() =>
        initializeInternalAuthSecretAccessor({
          consumeInternalAuthSecretApi: vi.fn(),
        }),
      ).not.toThrow();
    });

    it('works without any api extension', () => {
      expect(() => initializeInternalAuthSecretAccessor()).not.toThrow();
    });
  });

  describe('accessSecretFromAuthFlow', () => {
    it('provides auth secret to callback and zeroes it on completion', async () => {
      const { accessSecretFromAuthFlow } =
        initializeInternalAuthSecretAccessor();
      const secret = makeAuthSecret('test-password');

      await sendAuthSecretApi.sendAuthSecretInternally(secret);

      const result = await firstValueFrom(
        accessSecretFromAuthFlow(authSecret =>
          of(`received-${authSecret.byteLength}`),
        ),
      );

      expect(result).toBe(`received-${secret.byteLength}`);
      expect(secret.every(byte => byte === 0)).toBe(true);
    });

    it('throws when no secret is available on the bus', async () => {
      initializeInternalAuthSecretAccessor();

      // Bus starts with null after previous test cleared it
      // Send null explicitly to ensure clean state
      await sendAuthSecretApi.sendAuthSecretInternally(
        null as unknown as AuthSecret,
      );

      // Re-initialize to get a fresh accessor with null bus
      const { accessSecretFromAuthFlow } =
        initializeInternalAuthSecretAccessor();

      await expect(
        firstValueFrom(accessSecretFromAuthFlow(() => of('value'))),
      ).rejects.toThrow('Auth Secret did not arrive from the Auth Prompt');
    });

    it('does not clear bus when a new secret has already been pushed', async () => {
      const { accessSecretFromAuthFlow } =
        initializeInternalAuthSecretAccessor();
      const secret1 = makeAuthSecret('first-password');
      const secret2 = makeAuthSecret('second-password');

      await sendAuthSecretApi.sendAuthSecretInternally(secret1);

      await firstValueFrom(
        accessSecretFromAuthFlow(authSecret => {
          // Simulate a new secret arriving while callback is in progress
          void sendAuthSecretApi.sendAuthSecretInternally(secret2);
          return of(`received-${authSecret.byteLength}`);
        }),
      );

      // secret1 should be zeroed
      expect(secret1.every(byte => byte === 0)).toBe(true);
      // secret2 should NOT be zeroed (it's the new secret on the bus)
      expect(secret2.some(byte => byte !== 0)).toBe(true);
    });
  });
});
