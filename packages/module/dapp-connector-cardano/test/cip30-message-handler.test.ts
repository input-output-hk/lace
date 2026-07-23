import { Cardano } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { Ok } from '@lace-lib/util';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APIErrorCode } from '../src/common/api-error';
import { handleCip30Message } from '../src/mobile/services/cip30-message-handler';

import type {
  Cip30MessageHandlerDependencies,
  Cip30Request,
} from '../src/mobile/services/cip30-message-handler';
import type { CardanoProvider } from '@lace-contract/cardano-context';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

const cardanoAccount = (id: string): AnyAccount =>
  ({
    accountId: AccountId(id),
    blockchainName: 'Cardano',
  } as unknown as AnyAccount);

const bitcoinAccount = (id: string): AnyAccount =>
  ({
    accountId: AccountId(id),
    blockchainName: 'Bitcoin',
  } as unknown as AnyAccount);

const wallet = (id: string): AnyWallet =>
  ({ walletId: id } as unknown as AnyWallet);

const oneWallet: AnyWallet[] = [wallet('wallet-1')];

const persistedDapp = (origin: string): AuthorizedDappsDataSlice =>
  ({
    Cardano: [{ dapp: { origin } }],
  } as AuthorizedDappsDataSlice);

const createMockCardanoProvider = (): CardanoProvider =>
  ({
    submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
  } as unknown as CardanoProvider);

const createMockDeps = (
  overrides: Partial<Cip30MessageHandlerDependencies> = {},
): Cip30MessageHandlerDependencies => ({
  authorizedDapps$: of({ Cardano: [] } as AuthorizedDappsDataSlice),
  accountUtxos$: of({}),
  accountUnspendableUtxos$: of({}),
  rewardAccountDetails$: of({}),
  addresses$: of([]),
  accountTransactionHistory$: of({}),
  allAccounts$: of([]),
  allWallets$: of([]),
  chainId$: of(undefined),
  getAccountIdForOrigin: () => undefined,
  isSessionAuthorized: () => false,
  cardanoProvider: createMockCardanoProvider(),
  ...overrides,
});

const createRequest = (id: string, type: string): Cip30Request => ({
  id,
  type,
  source: 'lace-cip30',
});

const expectSuccessResponse = (
  result: Awaited<ReturnType<typeof handleCip30Message>>,
  id: string,
  expectedResult: unknown,
) => {
  expect(result).toEqual({
    type: 'response_ready',
    response: { id, success: true, result: expectedResult },
  });
};

const expectErrorResponse = (
  result: Awaited<ReturnType<typeof handleCip30Message>>,
  expected: { id: string; code: number; info: string },
) => {
  expect(result).toEqual({
    type: 'response_ready',
    response: {
      id: expected.id,
      success: false,
      error: { code: expected.code, info: expected.info },
    },
  });
};

describe('handleCip30Message', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('returns true when dApp is session-authorized', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => true }),
      );
      expectSuccessResponse(result, 'req-1', true);
    });

    it('returns false when dApp is not session-authorized', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => false }),
      );
      expectSuccessResponse(result, 'req-1', false);
    });

    it('returns true when not session-authorized but persisted + single wallet with single Cardano account', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1')]),
          allWallets$: of(oneWallet),
        }),
      );
      expectSuccessResponse(result, 'req-1', true);
    });

    it('returns false when persisted but multi-account (still needs user pick)', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1'), cardanoAccount('acc-2')]),
          allWallets$: of(oneWallet),
        }),
      );
      expectSuccessResponse(result, 'req-1', false);
    });

    it('returns true when persisted + multi-account but the origin already has a session account', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1'), cardanoAccount('acc-2')]),
          allWallets$: of(oneWallet),
          getAccountIdForOrigin: (o: string) =>
            o === 'https://dapp.example' ? AccountId('acc-2') : undefined,
        }),
      );
      expectSuccessResponse(result, 'req-1', true);
    });

    it('returns false when persisted with one Cardano account but multiple wallets', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'isEnabled'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1')]),
          allWallets$: of([wallet('wallet-1'), wallet('wallet-2')]),
        }),
      );
      expectSuccessResponse(result, 'req-1', false);
    });
  });

  describe('enable', () => {
    it('does not short-circuit on session authorization alone — re-evaluates so website-side disconnect can re-prompt', async () => {
      // Session-auth alone no longer short-circuits enable(); without
      // persisted + 1 wallet + 1 Cardano account, must prompt.
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          isSessionAuthorized: (o: string) => o === 'https://dapp.example',
          allAccounts$: of([cardanoAccount('acc-1')]),
          allWallets$: of(oneWallet),
        }),
      );
      expect(result).toEqual({
        type: 'authorization_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
      });
    });

    it('requires authorization when persisted + multi-account (cannot auto-pick)', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1'), cardanoAccount('acc-2')]),
        }),
      );
      expect(result).toEqual({
        type: 'authorization_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
      });
    });

    it('returns silent_authorization with the previously selected account when persisted + multi-account + origin has a session account', async () => {
      const sessionAccount = cardanoAccount('acc-2');
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1'), sessionAccount]),
          allWallets$: of(oneWallet),
          getAccountIdForOrigin: (o: string) =>
            o === 'https://dapp.example' ? AccountId('acc-2') : undefined,
        }),
      );
      expect(result).toEqual({
        type: 'silent_authorization',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        account: sessionAccount,
      });
    });

    it('requires authorization when single-account but dapp NOT persisted', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          allAccounts$: of([cardanoAccount('acc-1')]),
        }),
      );
      expect(result.type).toBe('authorization_required');
    });

    it('returns silent_authorization with the only Cardano account when persisted + single wallet with single Cardano account', async () => {
      const onlyAccount = cardanoAccount('acc-1');
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([onlyAccount]),
          allWallets$: of(oneWallet),
        }),
      );
      expect(result).toEqual({
        type: 'silent_authorization',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        account: onlyAccount,
      });
    });

    it('ignores non-Cardano accounts in the auto-grant count', async () => {
      const onlyCardano = cardanoAccount('acc-1');
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([onlyCardano, bitcoinAccount('btc-1')]),
          allWallets$: of(oneWallet),
        }),
      );
      expect(result).toEqual({
        type: 'silent_authorization',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        account: onlyCardano,
      });
    });

    it('requires authorization when persisted with one Cardano account but multiple wallets', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        'https://dapp.example',
        createMockDeps({
          authorizedDapps$: of(persistedDapp('https://dapp.example')),
          allAccounts$: of([cardanoAccount('acc-1')]),
          allWallets$: of([wallet('wallet-1'), wallet('wallet-2')]),
        }),
      );
      expect(result).toEqual({
        type: 'authorization_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
      });
    });

    it.each([
      {
        origin: 'https://newdapp.example',
        expectedName: 'newdapp.example',
        description: 'extracts hostname from standard URL',
      },
      {
        origin: 'https://app.sundaeswap.finance/swap',
        expectedName: 'app.sundaeswap.finance',
        description: 'extracts hostname from URL with path',
      },
      {
        origin: 'invalid-url',
        expectedName: 'invalid-url',
        description: 'falls back to origin when URL parsing fails',
      },
      {
        origin: '',
        expectedName: 'Unknown DApp',
        description: 'returns Unknown DApp when origin is empty',
      },
    ])('$description', async ({ origin, expectedName }) => {
      const result = await handleCip30Message(
        createRequest('req-1', 'enable'),
        origin,
        createMockDeps(),
      );
      expect(result).toEqual({
        type: 'authorization_required',
        requestId: 'req-1',
        dappOrigin: origin,
        dappName: expectedName,
      });
    });
  });

  describe('getNetworkId', () => {
    it('does not require authorization and returns network id', async () => {
      const deps = createMockDeps({
        chainId$: of({
          networkId: 0,
          networkMagic: Cardano.NetworkMagics.Preprod,
        } as Cardano.ChainId),
        isSessionAuthorized: () => false,
      });

      const result = await handleCip30Message(
        createRequest('req-1', 'getNetworkId'),
        'https://unauthorized.example',
        deps,
      );

      expect(result.type).toBe('response_ready');
      if (result.type === 'response_ready') {
        expect(result.response.success).toBe(true);
      }
    });
  });

  describe('authorization-required methods', () => {
    it.each([
      'getUtxos',
      'getBalance',
      'getUsedAddresses',
      'getUnusedAddresses',
      'getChangeAddress',
      'getRewardAddresses',
      'signTx',
    ])('%s returns Refused error when not authorized', async methodType => {
      const result = await handleCip30Message(
        createRequest('req-1', methodType),
        'https://unauthorized.example',
        createMockDeps(),
      );
      expectErrorResponse(result, {
        id: 'req-1',
        code: APIErrorCode.Refused,
        info: 'Not authorized. Call cardano.lace.enable() first.',
      });
    });
  });

  describe('error handling', () => {
    it('returns InternalError for unknown method', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'unknownMethod'),
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => true }),
      );
      expectErrorResponse(result, {
        id: 'req-1',
        code: APIErrorCode.InternalError,
        info: 'Unknown method: unknownMethod',
      });
    });

    it('catches generic errors and returns InternalError', async () => {
      const result = await handleCip30Message(
        createRequest('req-1', 'getNetworkId'),
        'https://dapp.example',
        createMockDeps({
          isSessionAuthorized: () => true,
          chainId$: of(undefined),
        }),
      );

      expect(result.type).toBe('response_ready');
      if (result.type === 'response_ready') {
        expect(result.response.success).toBe(false);
        expect(result.response.error?.code).toBe(APIErrorCode.InternalError);
      }
    });
  });

  describe('signTx', () => {
    it('returns signing_required response with transaction data', async () => {
      const txHex = 'a1b2c3d4e5f6';
      const message = {
        ...createRequest('req-1', 'signTx'),
        args: [txHex, false],
      };
      const result = await handleCip30Message(
        message,
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => true }),
      );
      expect(result).toEqual({
        type: 'signing_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        signingType: 'signTx',
        txHex,
        partialSign: false,
      });
    });

    it('defaults partialSign to false when not provided', async () => {
      const txHex = 'a1b2c3d4e5f6';
      const message = {
        ...createRequest('req-1', 'signTx'),
        args: [txHex],
      };
      const result = await handleCip30Message(
        message,
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => true }),
      );
      expect(result).toEqual({
        type: 'signing_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        signingType: 'signTx',
        txHex,
        partialSign: false,
      });
    });

    it('passes partialSign when set to true', async () => {
      const txHex = 'a1b2c3d4e5f6';
      const message = {
        ...createRequest('req-1', 'signTx'),
        args: [txHex, true],
      };
      const result = await handleCip30Message(
        message,
        'https://dapp.example',
        createMockDeps({ isSessionAuthorized: () => true }),
      );
      expect(result).toEqual({
        type: 'signing_required',
        requestId: 'req-1',
        dappOrigin: 'https://dapp.example',
        dappName: 'dapp.example',
        signingType: 'signTx',
        txHex,
        partialSign: true,
      });
    });
  });

  describe('method arguments passing', () => {
    const authorizedDeps = {
      isSessionAuthorized: () => true,
      accountUtxos$: of({}),
      addresses$: of([]),
      getAccountIdForOrigin: (origin: string) =>
        origin === 'https://dapp.example' ? AccountId('acc-1') : undefined,
    };

    it.each([
      {
        method: 'getUtxos',
        args: [undefined, { page: 0, limit: 10 }],
        expectedResult: null,
      },
      {
        method: 'getUsedAddresses',
        args: [{ page: 0, limit: 5 }],
        expectedResult: [],
      },
    ])(
      'passes args to $method handler',
      async ({ method, args, expectedResult }) => {
        const message = { ...createRequest('req-1', method), args };
        const result = await handleCip30Message(
          message,
          'https://dapp.example',
          createMockDeps(authorizedDeps),
        );
        expectSuccessResponse(result, 'req-1', expectedResult);
      },
    );
  });
});
