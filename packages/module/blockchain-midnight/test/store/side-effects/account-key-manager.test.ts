import { createTestScheduler } from '@cardano-sdk/util-dev';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { ByteArray, Milliseconds } from '@lace-sdk/util';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { defer, EMPTY, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createAccountKeyManager } from '../../../src/store/side-effects/account-key-manager';

import type { AccountKeys } from '@lace-contract/midnight-context';
import type { UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type { MockedObject } from 'vitest';

const createMockAccountKeys = (): MockedObject<AccountKeys> => {
  // Must be 32 bytes for ledger key generation
  const dustKeyBuffer = ByteArray(new Uint8Array(32).fill(1));
  const zswapKeyBuffer = ByteArray(new Uint8Array(32).fill(2));
  // Pre-compute ledger key objects (matching real implementation)
  const dustSecretKey = ledger.DustSecretKey.fromSeed(dustKeyBuffer);
  const zswapSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswapKeyBuffer);
  const clear = vi.fn();

  return {
    unshieldedKeystore: {
      getPublicKey: vi.fn(),
      signData: vi.fn(),
    } as unknown as UnshieldedKeystore,
    walletKeys: {
      dustKeyBuffer,
      zswapKeyBuffer,
      dustSecretKey,
      zswapSecretKeys,
    },
    clear,
  };
};

const IDLE_TIMEOUT_MS = Milliseconds(100);

describe('createAccountKeyManager', () => {
  describe('Core Behavior', () => {
    it('keys$ triggers single request, shares it among concurrent subscribers, caches result, and zeroizes after idle timeout', () => {
      createTestScheduler().run(({ cold, expectObservable, flush }) => {
        const mockKeys = createMockAccountKeys();
        // Key request completes at frame 2
        const requestKeys$ = cold('--(a|)', { a: mockKeys });
        const requestKeys = vi.fn().mockReturnValue(requestKeys$);

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: IDLE_TIMEOUT_MS,
        });

        // First subscription at frame 0, triggers request, gets keys at frame 2
        expectObservable(keyManager.keys$).toBe('--(a|)', { a: mockKeys });

        // Second subscription at frame 1 (before cache populated) shares pending request
        expectObservable(keyManager.keys$, '-^').toBe('--(a|)', {
          a: mockKeys,
        });

        // Third subscription at frame 3 (after cache populated) gets keys immediately
        expectObservable(keyManager.keys$, '---^').toBe('---(a|)', {
          a: mockKeys,
        });

        // areKeysAvailable$ reflects cache state and idle timeout
        // Frame 0: false, Frame 2: true, Frame 103: false (third sub at frame 3 resets timer)
        expectObservable(keyManager.areKeysAvailable$).toBe(
          `a-b ${IDLE_TIMEOUT_MS}ms c`,
          { a: false, b: true, c: false },
        );

        flush();

        // Only one key request should have been made (by first subscription)
        expect(requestKeys).toHaveBeenCalledTimes(1);

        // After idle timeout, keys are zeroized
        expect(mockKeys.clear).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cleanup on Teardown', () => {
    it('destroy() clears cached keys, zeroizes them, and completes observables', () => {
      // Use a very long idle timeout to test destroy behavior independently
      const LONG_IDLE_TIMEOUT = Milliseconds(100_000);

      createTestScheduler().run(({ cold, expectObservable, flush }) => {
        const mockKeys = createMockAccountKeys();
        const requestKeys$ = cold('-(a|)', { a: mockKeys });
        const requestKeys = vi.fn().mockReturnValue(requestKeys$);

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: LONG_IDLE_TIMEOUT,
        });

        // Observable that triggers destroy upon subscription
        const destroyTrigger$ = defer(() => {
          keyManager.destroy();
          return EMPTY;
        });

        // keys$ gets keys at frame 1
        expectObservable(keyManager.keys$).toBe('-(a|)', { a: mockKeys });

        // areKeysAvailable$: false at 0, true at 1, false at 4 (destroy), complete at 4
        expectObservable(keyManager.areKeysAvailable$).toBe('ab--(c|)', {
          a: false,
          b: true,
          c: false,
        });

        // Trigger destroy at frame 4
        expectObservable(destroyTrigger$, '----^').toBe('----|');

        flush();

        // Keys should be zeroized
        expect(mockKeys.clear).toHaveBeenCalledTimes(1);
      });
    });

    it('destroy() prevents further key requests', () => {
      createTestScheduler().run(({ cold, expectObservable, flush }) => {
        const mockKeys = createMockAccountKeys();
        const requestKeys$ = cold('-(a|)', { a: mockKeys });
        const requestKeys = vi.fn().mockReturnValue(requestKeys$);

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: IDLE_TIMEOUT_MS,
        });

        // Destroy before any subscription
        keyManager.destroy();

        // Subscribing to keys$ after destroy should complete immediately without requesting keys
        expectObservable(keyManager.keys$).toBe('|');

        flush();

        expect(requestKeys).not.toHaveBeenCalled();
      });
    });
  });

  describe('Idle Timeout', () => {
    it('after idle timeout and cache cleared, keys$ triggers new request', () => {
      createTestScheduler().run(({ cold, expectObservable, flush }) => {
        const mockKeys1 = createMockAccountKeys();
        const mockKeys2 = createMockAccountKeys();

        const requestKeys = vi
          .fn()
          .mockReturnValueOnce(cold('-a|', { a: mockKeys1 }))
          .mockReturnValueOnce(cold('-b|', { b: mockKeys2 }));

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: IDLE_TIMEOUT_MS,
        });

        // First subscription at frame 0, gets keys at frame 1
        expectObservable(keyManager.keys$).toBe('-(a|)', { a: mockKeys1 });

        // Second subscription at frame 102 (after timeout at 101), triggers new request
        expectObservable(keyManager.keys$, '102ms ^').toBe('102ms -(b|)', {
          b: mockKeys2,
        });

        flush();

        expect(requestKeys).toHaveBeenCalledTimes(2);
        expect(mockKeys1.clear).toHaveBeenCalledTimes(1);
      });
    });

    it('accessing keys$ resets the idle timer', () => {
      createTestScheduler().run(({ cold, expectObservable }) => {
        const mockKeys = createMockAccountKeys();
        // Request returns keys at frame 1
        const requestKeys$ = cold('-(a|)', { a: mockKeys });
        const requestKeys = vi.fn().mockReturnValue(requestKeys$);

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: IDLE_TIMEOUT_MS,
        });

        // First subscription at frame 0, populates cache at frame 1
        expectObservable(keyManager.keys$).toBe('-(a|)', { a: mockKeys });

        // Second subscription at frame 50 (half the timeout) resets the timer
        // Gets cached keys immediately
        expectObservable(keyManager.keys$, '50ms ^').toBe('50ms (a|)', {
          a: mockKeys,
        });

        // Without second access, timeout would fire at frame 1 + 100 = 101
        // With second access at frame 50, timeout fires at frame 50 + 100 = 150
        expectObservable(keyManager.areKeysAvailable$).toBe('ab 148ms c', {
          a: false,
          b: true,
          c: false,
        });
      });
    });
  });

  describe('Error Recovery', () => {
    it('after requestKeys error, subsequent keys$ triggers new request', () => {
      createTestScheduler().run(({ cold, expectObservable, flush }) => {
        const mockKeys = createMockAccountKeys();
        const testError = new AuthenticationCancelledError();

        // First request fails, second succeeds
        const requestKeys = vi
          .fn()
          .mockReturnValueOnce(throwError(() => testError))
          .mockReturnValueOnce(cold('-(a|)', { a: mockKeys }));

        const keyManager = createAccountKeyManager({
          requestKeys,
          idleTimeout: IDLE_TIMEOUT_MS,
        });

        // First subscription gets error at frame 0
        expectObservable(keyManager.keys$).toBe('#', undefined, testError);

        // Second subscription at frame 5 should trigger new request, NOT replay cached error
        expectObservable(keyManager.keys$, '-----^').toBe('------(a|)', {
          a: mockKeys,
        });

        flush();

        // Both requests should have been made
        expect(requestKeys).toHaveBeenCalledTimes(2);
      });
    });
  });
});
