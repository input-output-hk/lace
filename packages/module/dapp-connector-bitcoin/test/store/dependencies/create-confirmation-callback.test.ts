import { AccountId } from '@lace-contract/wallet-repo';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBitcoinConfirmationCallback,
  type BitcoinConfirmationRequest,
  type BitcoinConfirmationResult,
} from '../../../src/store/dependencies/create-confirmation-callback';

import type { Subscriber, Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

const SIGNING_ACCOUNT_ID = AccountId('bitcoin-account-0');

const createMockSender = (
  overrides: Partial<Runtime.MessageSender> = {},
): Runtime.MessageSender => ({
  tab: {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: true,
    active: true,
    pinned: false,
    incognito: false,
    title: 'Test DApp',
    url: 'https://test-dapp.example.com/app',
    favIconUrl: 'https://test-dapp.example.com/favicon.ico',
  },
  url: 'https://test-dapp.example.com/app',
  ...overrides,
});

const createMockHandleRequests = (
  emittedRequests: BitcoinConfirmationRequest[],
  resolveWith: (request: BitcoinConfirmationRequest) => void,
) => {
  return (request$: Observable<BitcoinConfirmationRequest>) => {
    request$.subscribe(request => {
      emittedRequests.push(request);
      resolveWith(request);
    });
    return of(undefined);
  };
};

describe('createBitcoinConfirmationCallback', () => {
  let mockSubscriber: Subscriber<unknown>;
  let emittedRequests: BitcoinConfirmationRequest[];

  beforeEach(() => {
    emittedRequests = [];
    mockSubscriber = {
      next: vi.fn(),
      error: vi.fn(),
      complete: vi.fn(),
    } as unknown as Subscriber<unknown>;
  });

  describe('callback creation', () => {
    it('creates a callback function and shutdown function', () => {
      const result = createBitcoinConfirmationCallback(
        () => EMPTY,
        mockSubscriber,
      );

      expect(typeof result.callback).toBe('function');
      expect(typeof result.shutdown).toBe('function');
    });

    it('subscribes handleRequests to the internal Subject', () => {
      const handleRequests = vi.fn(
        (request$: Observable<BitcoinConfirmationRequest>) => {
          request$.subscribe(request => emittedRequests.push(request));
          return of(undefined);
        },
      );

      createBitcoinConfirmationCallback(handleRequests, mockSubscriber);

      expect(handleRequests).toHaveBeenCalled();
    });
  });

  describe('signMessage request', () => {
    it('includes address, message and signatureType in the emitted request', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hello world',
        signatureType: 'bip322-simple',
      });

      expect(emittedRequests[0].address).toBe('bc1q...');
      expect(emittedRequests[0].message).toBe('hello world');
      expect(emittedRequests[0].signatureType).toBe('bip322-simple');
    });

    it('includes dApp information derived from the sender', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hello world',
        signatureType: 'ecdsa',
      });

      expect(emittedRequests[0].requestingDapp).toEqual({
        id: 'https://test-dapp.example.com',
        name: 'Test DApp',
        origin: 'https://test-dapp.example.com',
        imageUrl: 'https://test-dapp.example.com/favicon.ico',
      });
    });

    it('resolves isConfirmed true when the user confirms', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hello world',
        signatureType: 'ecdsa',
      });

      expect(result.isConfirmed).toBe(true);
    });

    it('resolves isConfirmed false when the user rejects', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: false,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hello world',
        signatureType: 'ecdsa',
      });

      expect(result.isConfirmed).toBe(false);
    });
  });

  describe('signPsbt request', () => {
    it('includes psbtsBase64, the signing account and options in the emitted request', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signPsbt', {
        psbtsBase64: ['psbt-1', 'psbt-2'],
        accountId: SIGNING_ACCOUNT_ID,
        options: { toSignInputs: [{ index: 0 }] },
      });

      expect(emittedRequests[0].psbtsBase64).toEqual(['psbt-1', 'psbt-2']);
      expect(emittedRequests[0].accountId).toBe(SIGNING_ACCOUNT_ID);
      expect(emittedRequests[0].options).toEqual({
        toSignInputs: [{ index: 0 }],
      });
    });

    it('represents a single signPsbt call as a one-element array', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signPsbt', {
        psbtsBase64: ['solo-psbt'],
        accountId: SIGNING_ACCOUNT_ID,
      });

      expect(emittedRequests[0].psbtsBase64).toEqual(['solo-psbt']);
    });

    it('resolves isConfirmed true when the user confirms', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'signPsbt', {
        psbtsBase64: ['psbt-1'],
        accountId: SIGNING_ACCOUNT_ID,
      });

      expect(result.isConfirmed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles a sender without tab information', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback({ url: 'https://test.com' }, 'signMessage', {
        address: 'bc1q...',
        message: 'hi',
        signatureType: 'ecdsa',
      });

      expect(emittedRequests[0].requestingDapp.name).toBe('');
      expect(emittedRequests[0].requestingDapp.imageUrl).toBe('');
    });

    it('handles a sender without a URL', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: BitcoinConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback({}, 'signMessage', {
        address: 'bc1q...',
        message: 'hi',
        signatureType: 'ecdsa',
      });

      expect(emittedRequests[0].requestingDapp.origin).toBe('');
      expect(emittedRequests[0].requestingDapp.id).toBe('');
    });

    it('resolves independent concurrent requests in the order they resolve', async () => {
      const resolvers: Array<(result: BitcoinConfirmationResult) => void> = [];

      const { callback } = createBitcoinConfirmationCallback(
        (request$: Observable<BitcoinConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            resolvers.push(request.resolve);
          });
          return of(undefined);
        },
        mockSubscriber,
      );

      const promise1 = callback(
        createMockSender({ url: 'https://dapp1.com' }),
        'signMessage',
        { address: 'bc1q1', message: 'first', signatureType: 'ecdsa' },
      );
      const promise2 = callback(
        createMockSender({ url: 'https://dapp2.com' }),
        'signPsbt',
        { psbtsBase64: ['psbt-2'], accountId: SIGNING_ACCOUNT_ID },
      );

      expect(emittedRequests).toHaveLength(2);

      resolvers[1]({ isConfirmed: false });
      resolvers[0]({ isConfirmed: true });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.isConfirmed).toBe(true);
      expect(result2.isConfirmed).toBe(false);
    });
  });

  describe('type constraints', () => {
    it('sets the request type correctly for each request kind', async () => {
      const { callback } = createBitcoinConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ isConfirmed: true });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hi',
        signatureType: 'ecdsa',
      });
      await callback(createMockSender(), 'signPsbt', {
        psbtsBase64: ['psbt-1'],
        accountId: SIGNING_ACCOUNT_ID,
      });

      expect(emittedRequests[0].type).toBe('signMessage');
      expect(emittedRequests[1].type).toBe('signPsbt');
    });
  });

  describe('shutdown', () => {
    it('prevents further requests from being processed after shutdown', async () => {
      const processedRequests: BitcoinConfirmationRequest[] = [];
      const { callback, shutdown } = createBitcoinConfirmationCallback(
        (request$: Observable<BitcoinConfirmationRequest>) => {
          request$.subscribe(request => {
            processedRequests.push(request);
          });
          return of(undefined);
        },
        mockSubscriber,
      );

      shutdown();

      const requestPromise = callback(createMockSender(), 'signMessage', {
        address: 'bc1q...',
        message: 'hi',
        signatureType: 'ecdsa',
      });

      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });

      expect(processedRequests).toHaveLength(0);

      void requestPromise;
    });

    it('can be called safely', () => {
      const { shutdown } = createBitcoinConfirmationCallback(
        () => of(undefined),
        mockSubscriber,
      );

      expect(() => {
        shutdown();
      }).not.toThrow();
    });
  });
});
