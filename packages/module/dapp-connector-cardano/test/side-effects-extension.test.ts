import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  buildCip30SignTxWitnessSet,
  countTransactionSignatures,
} from '@lace-contract/cardano-context';
import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { Err, Ok } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import {
  BehaviorSubject,
  EMPTY,
  NEVER,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CARDANO_DAPP_SIGN_TX_LOCATION } from '../src/browser/const';
import {
  clearResolvedInputsOnSignTxClear,
  closeRequestedPopup,
  closeRequestedSheet,
  connectCardanoDappConnectorApi,
  initializeSideEffects,
  promptCardanoAuthorizeDapp,
  resolveForeignTransactionInputs,
} from '../src/browser/store/side-effects';
import { signData$, signTx$ } from '../src/browser/store/util';

import type { ActionCreators, Selectors } from '../src';
import type { SigningResult } from '../src/browser/store/util';
import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type * as CardanoContext from '@lace-contract/cardano-context';
import type {
  AuthorizedDappsDataSlice,
  Dapp,
} from '@lace-contract/dapp-connector';
import type {
  ActionObservables,
  SideEffectDependencies,
  StateObservables,
  WithLaceContext,
} from '@lace-contract/module';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

// Stub chrome.sidePanel so findTargetSidePanel reports it as available.
(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

// Type for handleRequests function
type HandleRequestsFunction = (
  request$: Observable<CardanoConfirmationRequest>,
) => Observable<unknown>;

// Type for the mock connectCardanoDappConnector argument
interface ConnectCardanoDappConnectorArgument {
  handleRequests: HandleRequestsFunction;
  authorizedDapps$: Observable<unknown>;
  accountUtxos$: Observable<unknown>;
  addresses$: Observable<unknown>;
  chainId$: Observable<unknown>;
  getAccountIdForOrigin: (origin: string) => unknown;
}

// Mock the utility functions
// Note: connect$ is not mocked because it's not used by handleRequests
// (enable() goes through authenticator channel -> promptCardanoAuthorizeDapp)
vi.mock('../src/browser/store/util', async () => {
  const actual = await vi.importActual('../src/browser/store/util');
  return {
    ...actual,
    signTx$: vi.fn().mockReturnValue(of({ type: 'SIGN_TX_ACTION' })),
    signData$: vi.fn().mockReturnValue(of({ type: 'SIGN_DATA_ACTION' })),
    detectViewClosure: vi.fn().mockReturnValue(EMPTY),
  };
});

/**
 * Mock BIP32 derivation used by the signTransaction wrapper for DRep key
 * hashing.
 */
vi.mock('@cardano-sdk/key-management', async () => {
  const actual = await vi.importActual('@cardano-sdk/key-management');
  return {
    ...actual,
    Bip32Account: vi.fn().mockImplementation(() => ({
      derivePublicKey: vi.fn().mockResolvedValue('0'.repeat(64)),
    })),
  };
});

vi.mock('@lace-contract/cardano-context', async () => {
  const actual = await vi.importActual<typeof CardanoContext>(
    '@lace-contract/cardano-context',
  );
  return {
    ...actual,
    buildCip30SignTxWitnessSet: vi.fn(actual.buildCip30SignTxWitnessSet),
    countTransactionSignatures: vi.fn(actual.countTransactionSignatures),
  };
});

vi.mock('@cardano-sdk/crypto', async () => {
  const actual = await vi.importActual('@cardano-sdk/crypto');
  return {
    ...actual,
    SodiumBip32Ed25519: {
      create: vi.fn().mockResolvedValue({
        derivePublicKey: vi.fn().mockReturnValue('0'.repeat(64)),
        getRawPublicKey: vi.fn().mockReturnValue('0'.repeat(64)),
      }),
    },
    Ed25519PublicKey: {
      fromHex: vi.fn().mockReturnValue({
        hash: vi.fn().mockReturnValue({
          hex: vi.fn().mockReturnValue('0'.repeat(56)),
        }),
      }),
    },
  };
});

const mockDapp: Dapp = {
  id: DappId('https://test-dapp.com'),
  name: 'Test DApp',
  origin: 'https://test-dapp.com',
  imageUrl: 'https://test-dapp.com/favicon.ico',
};

describe('side-effects-extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectCardanoDappConnectorApi', () => {
    const createActionObservables = () => ({
      cardanoDappConnector: {
        confirmConnect$: new Subject<void>(),
        rejectConnect$: new Subject<void>(),
        confirmSignTx$: new Subject<void>(),
        rejectSignTx$: new Subject<void>(),
        confirmSignData$: new Subject<void>(),
        rejectSignData$: new Subject<void>(),
      },
      views: {
        viewDisconnected$: new Subject<{ payload: string }>(),
      },
    });

    const createStateObservables = () => ({
      views: { selectOpenViews$: of([]) },
      appLock: { isUnlocked$: of(true) },
      dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
      cardanoContext: {
        selectChainId$: of(undefined),
        selectCollateralOwnershipUtxos$: of({}),
        selectAvailableAccountUtxos$: of({}),
      },
      addresses: { selectAllAddresses$: of([]) },
      cardanoDappConnector: { selectSessionAccountByOrigin$: of({}) },
      wallets: { selectActiveNetworkAccounts$: of([]) },
    });

    const createDependencies = (
      handleRequestsImplementation?: (
        request$: Observable<CardanoConfirmationRequest>,
      ) => Observable<unknown>,
    ) => {
      const requestSubject = new Subject<CardanoConfirmationRequest>();

      const mockConnectCardanoDappConnector = vi.fn(
        (
          argument: ConnectCardanoDappConnectorArgument,
        ): Observable<unknown> => {
          // Store the handleRequests function and call it with the request subject
          if (handleRequestsImplementation) {
            return handleRequestsImplementation(requestSubject);
          }
          return argument.handleRequests(requestSubject);
        },
      );

      return {
        connectCardanoDappConnector: mockConnectCardanoDappConnector,
        actions: {
          views: { openView: vi.fn(), closeView: vi.fn() },
          cardanoDappConnector: {
            setConnectRequest: vi.fn(),
            setSignTxRequest: vi.fn(),
            setSignDataRequest: vi.fn(),
          },
        },
        authenticate: vi.fn().mockReturnValue(of(true)),
        accessAuthSecret: vi.fn((callback: (secret: Uint8Array) => unknown) =>
          callback(new Uint8Array([1, 2, 3])),
        ),
        cardanoProvider: {
          submitTx: vi.fn().mockReturnValue(of(Ok('mock-tx-hash'))),
        },
        requestSubject,
        // Helper to get handleRequests from mock call
        getHandleRequests: () => {
          const calls = mockConnectCardanoDappConnector.mock
            .calls as ConnectCardanoDappConnectorArgument[][];
          return calls[0][0].handleRequests;
        },
      };
    };

    it('should call connectCardanoDappConnector with correct parameters', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies(() => EMPTY);

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      expect(deps.connectCardanoDappConnector).toHaveBeenCalledTimes(1);
      expect(deps.connectCardanoDappConnector).toHaveBeenCalledWith(
        expect.objectContaining({
          authorizedDapps$:
            stateObservables.dappConnector.selectAuthorizedDapps$,
          accountUtxos$:
            stateObservables.cardanoContext.selectAvailableAccountUtxos$,
          addresses$: stateObservables.addresses.selectAllAddresses$,
          chainId$: stateObservables.cardanoContext.selectChainId$,
          getAccountIdForOrigin: expect.any(Function) as (
            origin: string,
          ) => unknown,
          handleRequests: expect.any(Function) as HandleRequestsFunction,
        }),
      );
    });

    // Note: 'connect' type requests are NOT routed through handleRequests.
    // enable() uses the authenticator channel -> authorizeDapp.start -> promptCardanoAuthorizeDapp
    // The handleRequests callback only handles signTx and signData.

    it('should route signTx requests to signTx$ utility', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        collateralRefusal: null,
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signTx',
            collateralRefusal: null,
          }) as CardanoConfirmationRequest,
          selectOpenViews$: stateObservables.views.selectOpenViews$,
          actions: deps.actions,
        }),
      );
    });

    it('should route signTx requests when app is unlocked (e.g. AwaitingSetup)', () => {
      const actionObservables = createActionObservables();
      const stateObservables = {
        ...createStateObservables(),
        appLock: {
          isUnlocked$: of(true),
        },
      };
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        collateralRefusal: null,
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signTx',
            collateralRefusal: null,
          }) as CardanoConfirmationRequest,
        }),
      );
    });

    it('queues a signing request that arrives mid-confirmation and serves it once the first settles', () => {
      const deps = createDependencies();
      connectCardanoDappConnectorApi(
        createActionObservables() as unknown as ActionObservables<ActionCreators>,
        createStateObservables() as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      // A confirmation that stays open: the flow only completes when the user acts.
      const firstFlow$ = new Subject<unknown>();
      vi.mocked(signTx$).mockReturnValueOnce(
        firstFlow$ as unknown as ReturnType<typeof signTx$>,
      );

      const requestSubject = new Subject<CardanoConfirmationRequest>();
      deps.getHandleRequests()(requestSubject).subscribe();

      const second = {
        type: 'signTx' as const,
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'beefdead',
        partialSign: false,
      } as unknown as CardanoConfirmationRequest;

      requestSubject.next({
        type: 'signTx',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      } as unknown as CardanoConfirmationRequest);
      requestSubject.next(second);

      expect(signTx$).toHaveBeenCalledTimes(1);

      firstFlow$.complete();

      expect(signTx$).toHaveBeenCalledTimes(2);
      expect(signTx$).toHaveBeenLastCalledWith(
        expect.objectContaining({ request: second }),
      );
    });

    it('refuses a queued request whose port dropped before its turn, without opening a prompt for it', () => {
      const deps = createDependencies();
      connectCardanoDappConnectorApi(
        createActionObservables() as unknown as ActionObservables<ActionCreators>,
        createStateObservables() as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const firstFlow$ = new Subject<unknown>();
      vi.mocked(signTx$).mockReturnValueOnce(
        firstFlow$ as unknown as ReturnType<typeof signTx$>,
      );

      const requestSubject = new Subject<CardanoConfirmationRequest>();
      deps.getHandleRequests()(requestSubject).subscribe();

      requestSubject.next({
        type: 'signTx',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      } as unknown as CardanoConfirmationRequest);

      // Replaying, like production's shareReplay: the drop lands while the
      // request is queued, and must still be seen when its turn arrives.
      const dropped$ = new ReplaySubject<void>(1);
      const resolveQueued = vi.fn();
      requestSubject.next({
        type: 'signTx',
        resolve: resolveQueued,
        requestingDapp: mockDapp,
        txHex: 'beefdead',
        partialSign: false,
        disconnected$: dropped$,
      } as unknown as CardanoConfirmationRequest);

      dropped$.next();
      firstFlow$.complete();

      expect(resolveQueued).toHaveBeenCalledWith({ outcome: 'disconnected' });
      expect(signTx$).toHaveBeenCalledTimes(1);
    });

    it('routes signTx requests while the app is locked, so the popup can host the unlock prompt', () => {
      const actionObservables = createActionObservables();
      const stateObservables = {
        ...createStateObservables(),
        appLock: {
          isUnlocked$: of(false),
        },
      };
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signTx',
        collateralRefusal: null,
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        txHex: 'deadbeef',
        partialSign: false,
      });

      expect(signTx$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signTx',
          }) as CardanoConfirmationRequest,
        }),
      );
    });

    it('routes signData requests while the app is locked', () => {
      const actionObservables = createActionObservables();
      const stateObservables = {
        ...createStateObservables(),
        appLock: {
          isUnlocked$: of(false),
        },
      };
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();

      handleRequests(requestSubject).subscribe();

      requestSubject.next({
        type: 'signData',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        signDataAddress: 'addr_test1',
        signDataPayload: 'deadbeef',
      } as unknown as CardanoConfirmationRequest);

      expect(signData$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signData',
          }) as CardanoConfirmationRequest,
        }),
      );
    });

    it('should route signData requests to signData$ utility', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      requestSubject.next({
        type: 'signData',
        collateralRefusal: null,
        resolve: vi.fn(),
        requestingDapp: mockDapp,
        signDataAddress: 'addr_test1...',
        signDataPayload: 'cafebabe',
      });

      expect(signData$).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            type: 'signData',
            collateralRefusal: null,
          }) as CardanoConfirmationRequest,
          selectOpenViews$: stateObservables.views.selectOpenViews$,
          actions: deps.actions,
        }),
      );
    });

    it('should return EMPTY for unknown request types', () => {
      const actionObservables = createActionObservables();
      const stateObservables = createStateObservables();
      const deps = createDependencies();

      connectCardanoDappConnectorApi(
        actionObservables as unknown as ActionObservables<ActionCreators>,
        stateObservables as unknown as StateObservables<Selectors>,
        deps as unknown as SideEffectDependencies &
          WithLaceContext<Selectors, ActionCreators>,
      );

      const handleRequests = deps.getHandleRequests();
      // Use 'unknown' to represent an unknown request type
      const requestSubject = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      handleRequests(requestSubject).subscribe((action: unknown) =>
        emissions.push(action),
      );

      // Emit a request with an unknown type (cast to bypass type checking)
      requestSubject.next({
        type: 'unknownType',
        resolve: vi.fn(),
        requestingDapp: mockDapp,
      } as unknown as CardanoConfirmationRequest);

      // Should not call any utility function
      expect(signTx$).not.toHaveBeenCalled();
      expect(signData$).not.toHaveBeenCalled();
      expect(emissions).toHaveLength(0);
    });

    describe('submitTransaction pending activity dispatch', () => {
      const OWN_ADDRESS = Cardano.PaymentAddress(
        'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
      );
      const FOREIGN_ADDRESS = Cardano.PaymentAddress(
        'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
      );
      const PREV_TX_ID = Cardano.TransactionId(
        '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
      );
      const CHAIN_ID = Cardano.ChainIds.Preprod;
      const ACCOUNT_ID = AccountId('acct-1');

      const ownUtxo: Cardano.Utxo = [
        { txId: PREV_TX_ID, index: 0, address: OWN_ADDRESS },
        { address: OWN_ADDRESS, value: { coins: 10_000_000n } },
      ];

      const buildSignedTxCbor = (): string =>
        Serialization.Transaction.fromCore({
          body: {
            inputs: [{ txId: PREV_TX_ID, index: 0 }],
            outputs: [
              {
                address: FOREIGN_ADDRESS,
                value: { coins: 9_800_000n },
              },
            ],
            fee: 200_000n,
          },
          id: '0'.repeat(64) as Cardano.TransactionId,
          witness: { signatures: new Map() },
        }).toCbor();

      const createStateForSubmit = () => ({
        views: { selectOpenViews$: of([]) },
        appLock: { isUnlocked$: of(true) },
        dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
        cardanoContext: {
          selectChainId$: of(CHAIN_ID),
          selectCollateralOwnershipUtxos$: of({ [ACCOUNT_ID]: [ownUtxo] }),
          selectAvailableAccountUtxos$: of({ [ACCOUNT_ID]: [ownUtxo] }),
          selectAccountUnspendableUtxos$: of({}),
          selectRewardAccountDetails$: of({}),
        },
        addresses: {
          selectAllAddresses$: of([
            {
              accountId: ACCOUNT_ID,
              blockchainName: 'Cardano' as const,
              address: OWN_ADDRESS,
              data: {},
            },
          ]),
        },
        cardanoDappConnector: { selectSessionAccountByOrigin$: of({}) },
        wallets: {
          selectActiveNetworkAccounts$: of([]),
          selectAll$: of([]),
        },
      });

      const createDepsForSubmit = (
        submitTxImpl?: ReturnType<typeof vi.fn>,
        getTransactionDetailsImpl?: ReturnType<typeof vi.fn>,
      ) => {
        const captured: {
          submitTransaction?: (cbor: string) => Promise<string>;
        } = {};
        const mockConnect = vi.fn(
          (argument: {
            submitTransaction: (cbor: string) => Promise<string>;
          }) => {
            captured.submitTransaction = argument.submitTransaction;
            return EMPTY;
          },
        );
        return {
          connectCardanoDappConnector: mockConnect,
          actions: {
            activities: {
              upsertActivities: vi.fn((payload: unknown) => ({
                type: 'activities/upsertActivities',
                payload,
              })),
            },
          },
          authenticate: vi.fn(),
          accessAuthSecret: vi.fn(),
          cardanoProvider: {
            submitTx:
              submitTxImpl ??
              vi.fn().mockReturnValue(of(Ok('submitted-tx-hash'))),
            getTransactionDetails:
              getTransactionDetailsImpl ??
              vi.fn().mockReturnValue(of(Err(new Error('tx not found')))),
          },
          signerFactory: {},
          captured,
        };
      };

      it('dispatches upsertActivities when submit succeeds and tx is attributable', async () => {
        const actionObservables = createActionObservables();
        const stateObservables = createStateForSubmit();
        const deps = createDepsForSubmit();

        const sideEffect$ = connectCardanoDappConnectorApi(
          actionObservables as unknown as ActionObservables<ActionCreators>,
          stateObservables as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );

        const emissions: unknown[] = [];
        const sub = sideEffect$.subscribe(action => emissions.push(action));

        const cbor = buildSignedTxCbor();
        const txId = await deps.captured.submitTransaction!(cbor);

        expect(txId).toBe('submitted-tx-hash');
        expect(deps.actions.activities.upsertActivities).toHaveBeenCalledTimes(
          1,
        );
        expect(deps.actions.activities.upsertActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            accountId: ACCOUNT_ID,
            activities: [
              expect.objectContaining({
                accountId: ACCOUNT_ID,
                type: 'Pending',
              }),
            ],
          }),
        );
        expect(emissions).toEqual([
          expect.objectContaining({ type: 'activities/upsertActivities' }),
        ]);

        sub.unsubscribe();
      });

      it('does not dispatch upsertActivities when tx is not attributable to any account', async () => {
        const actionObservables = createActionObservables();
        const stateObservables = {
          ...createStateForSubmit(),
          cardanoContext: {
            ...createStateForSubmit().cardanoContext,
            selectCollateralOwnershipUtxos$: of({}),
            selectAvailableAccountUtxos$: of({}),
          },
          addresses: { selectAllAddresses$: of([]) },
        };
        const deps = createDepsForSubmit();

        const sideEffect$ = connectCardanoDappConnectorApi(
          actionObservables as unknown as ActionObservables<ActionCreators>,
          stateObservables as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );

        const emissions: unknown[] = [];
        const sub = sideEffect$.subscribe(action => emissions.push(action));

        const cbor = buildSignedTxCbor();
        const txId = await deps.captured.submitTransaction!(cbor);

        expect(txId).toBe('submitted-tx-hash');
        expect(deps.actions.activities.upsertActivities).not.toHaveBeenCalled();
        expect(emissions).toHaveLength(0);

        sub.unsubscribe();
      });

      it('propagates provider errors and dispatches no activity', async () => {
        const actionObservables = createActionObservables();
        const stateObservables = createStateForSubmit();
        const providerError = new Error('submit failed');
        const submitTxMock = vi.fn().mockReturnValue(of(Err(providerError)));
        const deps = createDepsForSubmit(submitTxMock);

        const sideEffect$ = connectCardanoDappConnectorApi(
          actionObservables as unknown as ActionObservables<ActionCreators>,
          stateObservables as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );

        const emissions: unknown[] = [];
        const sub = sideEffect$.subscribe(action => emissions.push(action));

        const cbor = buildSignedTxCbor();
        await expect(deps.captured.submitTransaction!(cbor)).rejects.toThrow(
          'submit failed',
        );

        expect(deps.actions.activities.upsertActivities).not.toHaveBeenCalled();
        expect(emissions).toHaveLength(0);

        sub.unsubscribe();
      });

      it('maps a failed resubmission to success when the tx is already on-chain', async () => {
        const actionObservables = createActionObservables();
        const stateObservables = createStateForSubmit();
        const submitTxMock = vi
          .fn()
          .mockReturnValue(of(Err(new Error('BadInputsUTxO'))));
        const getTransactionDetailsMock = vi
          .fn()
          .mockReturnValue(of(Ok({ status: 'confirmed' })));
        const deps = createDepsForSubmit(
          submitTxMock,
          getTransactionDetailsMock,
        );

        const sideEffect$ = connectCardanoDappConnectorApi(
          actionObservables as unknown as ActionObservables<ActionCreators>,
          stateObservables as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );

        const sub = sideEffect$.subscribe();

        const cbor = buildSignedTxCbor();
        const expectedTxId = Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(cbor),
        ).getId();
        const txId = await deps.captured.submitTransaction!(cbor);

        expect(txId).toBe(expectedTxId);
        expect(getTransactionDetailsMock).toHaveBeenCalledWith(expectedTxId, {
          chainId: CHAIN_ID,
        });
        expect(deps.actions.activities.upsertActivities).toHaveBeenCalledTimes(
          1,
        );

        sub.unsubscribe();
      });

      it('propagates the submit error when the tx is not on-chain', async () => {
        const actionObservables = createActionObservables();
        const stateObservables = createStateForSubmit();
        const submitTxMock = vi
          .fn()
          .mockReturnValue(of(Err(new Error('submit failed'))));
        const getTransactionDetailsMock = vi
          .fn()
          .mockReturnValue(of(Err(new Error('tx not found'))));
        const deps = createDepsForSubmit(
          submitTxMock,
          getTransactionDetailsMock,
        );

        const sideEffect$ = connectCardanoDappConnectorApi(
          actionObservables as unknown as ActionObservables<ActionCreators>,
          stateObservables as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );

        const sub = sideEffect$.subscribe();

        const cbor = buildSignedTxCbor();
        await expect(deps.captured.submitTransaction!(cbor)).rejects.toThrow(
          'submit failed',
        );
        expect(getTransactionDetailsMock).toHaveBeenCalledTimes(1);

        sub.unsubscribe();
      });
    });

    describe('signTransaction result reporting', () => {
      const CHAIN_ID = Cardano.ChainIds.Preprod;
      const ACCOUNT_ID = AccountId('acct-1');
      const WALLET_ID = WalletId('wallet-1');
      const ORIGIN = 'https://test-dapp.com';

      const account = {
        accountId: ACCOUNT_ID,
        walletId: WALLET_ID,
        accountIndex: 0,
        accountType: 'InMemory',
        name: 'Test Account',
        blockchainName: 'Cardano' as const,
        blockchainSpecific: {
          accountIndex: 0,
          chainId: CHAIN_ID,
          extendedAccountPublicKey: '0'.repeat(128),
        },
      } as unknown as AnyAccount;

      const wallet = {
        walletId: WALLET_ID,
        name: 'Test Wallet',
        type: WalletType.InMemory,
        metadata: {},
        accounts: [account],
      } as unknown as AnyWallet;

      const createStateForSignTx = () => ({
        views: { selectOpenViews$: of([]) },
        appLock: { isUnlocked$: of(true) },
        dappConnector: { selectAuthorizedDapps$: of({ Cardano: [] }) },
        cardanoContext: {
          selectChainId$: of(CHAIN_ID),
          selectAvailableAccountUtxos$: of({}),
          selectCollateralOwnershipUtxos$: of({}),
          selectAccountUnspendableUtxos$: of({}),
          selectAccountTransactionHistory$: of({}),
          selectRewardAccountDetails$: of({}),
        },
        addresses: { selectAllAddresses$: of([]) },
        cardanoDappConnector: {
          selectSessionAccountByOrigin$: of({ [ORIGIN]: ACCOUNT_ID }),
        },
        wallets: {
          selectActiveNetworkAccounts$: of([account]),
          selectAll$: of([wallet]),
        },
      });

      it('emits error signing result when the signer factory throws for an unsupported account', async () => {
        const captured: {
          signTransaction?: (
            txCbor: string,
            partialSign: boolean,
            origin: string,
          ) => Promise<string>;
          signingResult$?: Subject<SigningResult>;
        } = {};
        const mockConnect = vi.fn(
          (argument: {
            signTransaction: (
              txCbor: string,
              partialSign: boolean,
              origin: string,
            ) => Promise<string>;
            signingResult$: Subject<SigningResult>;
          }) => {
            captured.signTransaction = argument.signTransaction;
            captured.signingResult$ = argument.signingResult$;
            return EMPTY;
          },
        );
        const deps = {
          connectCardanoDappConnector: mockConnect,
          actions: {},
          authenticate: vi.fn().mockReturnValue(of(true)),
          accessAuthSecret: vi.fn(),
          cardanoProvider: { submitTx: vi.fn() },
          signerFactory: {
            canSign: () => false,
            createTransactionSigner: () => {
              throw new Error(
                'No signer factory registered for account type "InMemory"',
              );
            },
          },
        };

        const sideEffect$ = connectCardanoDappConnectorApi(
          createActionObservables() as unknown as ActionObservables<ActionCreators>,
          createStateForSignTx() as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );
        const sub = sideEffect$.subscribe();

        const results: SigningResult[] = [];
        captured.signingResult$!.subscribe(result => results.push(result));

        await expect(
          captured.signTransaction!('84a400', true, ORIGIN),
        ).rejects.toThrow('No signer factory registered');
        expect(results).toEqual([{ type: 'error', hwErrorKeys: undefined }]);

        sub.unsubscribe();
      });

      it('emits error, not success, when the witness set fails to build after a successful sign', async () => {
        const captured: {
          signTransaction?: (
            txCbor: string,
            partialSign: boolean,
            origin: string,
          ) => Promise<string>;
          signingResult$?: Subject<SigningResult>;
        } = {};
        const mockConnect = vi.fn(
          (argument: {
            signTransaction: (
              txCbor: string,
              partialSign: boolean,
              origin: string,
            ) => Promise<string>;
            signingResult$: Subject<SigningResult>;
          }) => {
            captured.signTransaction = argument.signTransaction;
            captured.signingResult$ = argument.signingResult$;
            return EMPTY;
          },
        );
        const deps = {
          connectCardanoDappConnector: mockConnect,
          actions: {},
          authenticate: vi.fn().mockReturnValue(of(true)),
          accessAuthSecret: vi.fn(),
          cardanoProvider: { submitTx: vi.fn() },
          signerFactory: {
            canSign: () => true,
            createTransactionSigner: () => ({
              sign: () => of({ serializedTx: '84a400' }),
            }),
          },
        };

        vi.mocked(countTransactionSignatures).mockReturnValueOnce(1);
        vi.mocked(buildCip30SignTxWitnessSet).mockImplementationOnce(() => {
          throw new Error('witness set build failed');
        });

        const sideEffect$ = connectCardanoDappConnectorApi(
          createActionObservables() as unknown as ActionObservables<ActionCreators>,
          createStateForSignTx() as unknown as StateObservables<Selectors>,
          deps as unknown as SideEffectDependencies &
            WithLaceContext<Selectors, ActionCreators>,
        );
        const sub = sideEffect$.subscribe();

        const results: SigningResult[] = [];
        captured.signingResult$!.subscribe(result => results.push(result));

        await expect(
          captured.signTransaction!('84a400', true, ORIGIN),
        ).rejects.toThrow('witness set build failed');
        expect(results).toEqual([{ type: 'error', hwErrorKeys: undefined }]);

        sub.unsubscribe();
      });
    });
  });

  describe('promptCardanoAuthorizeDapp', () => {
    const sidePanelView = {
      id: ViewId('sidePanel1'),
      location: '/',
      type: 'sidePanel' as const,
      windowId: 1,
    };

    const popupView = {
      id: ViewId('popup1'),
      location: '/cardano-dapp-connect',
      type: 'popupWindow' as const,
    };

    const mockAccount = {
      accountId: 'account-1',
      blockchainName: 'Cardano',
    } as unknown as AnyAccount;

    const startAction = (windowId?: number) => ({
      type: 'authorizeDapp/start' as const,
      payload: {
        dapp: mockDapp,
        blockchainName: 'Cardano' as const,
        windowId,
      },
    });

    const nonCardanoStartAction = {
      type: 'authorizeDapp/start' as const,
      payload: {
        dapp: mockDapp,
        blockchainName: 'Midnight' as const,
      },
    };

    const createTestDependencies = () => ({
      actions: {
        views: {
          setActiveSheetPage: vi.fn((p: unknown) => ({
            type: 'views/setActiveSheetPage',
            payload: p,
          })),
          openView: vi.fn((p: unknown) => ({
            type: 'views/openView',
            payload: p,
          })),
          closeView: vi.fn((id: unknown) => ({
            type: 'views/closeView',
            payload: id,
          })),
        },
        cardanoDappConnector: {
          setPendingAuthRequest: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/setPendingAuthRequest',
            payload: p,
          })),
          clearPendingAuthRequest: vi.fn(() => ({
            type: 'cardanoDappConnector/clearPendingAuthRequest',
          })),
          confirmAuth: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/confirmAuth',
            payload: p,
          })),
          setSessionAccountForOrigin: vi.fn((p: unknown) => ({
            type: 'cardanoDappConnector/setSessionAccountForOrigin',
            payload: p,
          })),
        },
        authorizeDapp: {
          completed: vi.fn((p: unknown) => ({
            type: 'authorizeDapp/completed',
            payload: p,
          })),
        },
      } as unknown as ActionCreators,
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
      },
    });

    it('filters non-Cardano blockchains', () => {
      testSideEffect(
        promptCardanoAuthorizeDapp,
        ({ hot, expectObservable }) => ({
          actionObservables: {
            authorizeDapp: {
              start$: hot('-a', { a: nonCardanoStartAction }),
              completed$: NEVER,
              failed$: NEVER,
            },
            cardanoDappConnector: {
              confirmConnect$: NEVER,
              rejectConnect$: NEVER,
            },
            views: {
              viewDisconnected$: NEVER,
              locationChanged$: NEVER,
            },
          },
          stateObservables: {
            views: { selectOpenViews$: hot('a', { a: [] }) },
            dappConnector: {
              selectAuthorizedDapps$: hot('a', {
                a: {} as AuthorizedDappsDataSlice,
              }),
            },
            cardanoDappConnector: {
              selectSessionAccountByOrigin$: hot('a', { a: {} }),
            },
            wallets: {
              selectActiveNetworkAccounts$: hot('a', { a: [] }),
              selectAll$: hot('a', { a: [] }),
            },
          },
          dependencies: createTestDependencies(),
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        }),
      );
    });

    it('sheet mode: dispatches confirmAuth and completed on confirm', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: hot('- 200ms a', {
              a: {
                type: 'cardanoDappConnector/confirmConnect',
                payload: { account: mockAccount },
              },
            }),
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: cold('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: cold('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', { a: [] }),
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: mockAccount,
          });
          expect(
            deps.actions.cardanoDappConnector.setSessionAccountForOrigin,
          ).toHaveBeenCalledWith({
            origin: mockDapp.origin,
            accountId: mockAccount.accountId,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
        },
      }));
    });

    it('sheet mode: dispatches completed(false) on reject', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 200ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: cold('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: cold('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', { a: [] }),
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('sheet mode: opens a new auth UI for a second request even when the first never completed (dapp disconnected)', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            // Two enable()s for the same dapp, spaced past the 100ms debounce;
            // the first never resolves.
            start$: hot('-a 298ms b', {
              a: startAction(1),
              b: startAction(1),
            }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: cold('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: cold('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', { a: [] }),
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          const authorizeSheetOpens = vi
            .mocked(deps.actions.views.setActiveSheetPage)
            .mock.calls.filter(
              ([payload]) =>
                (payload as { route?: string } | null)?.route ===
                'AuthorizeDapp',
            );
          expect(authorizeSheetOpens).toHaveLength(2);
        },
      }));
    });

    it('sheet mode: dispatches completed(false) on panel closure', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: hot('- 200ms a', {
              a: {
                type: 'views/viewDisconnected',
                payload: sidePanelView.id,
              },
            }),
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: cold('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: cold('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', { a: [] }),
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('popup mode: dispatches confirmAuth and completed on confirm', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/confirmConnect',
                payload: { account: mockAccount },
              },
            }),
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c', {
              a: [],
              b: [],
              c: [popupView],
            }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [] }),
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: mockAccount,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
        },
      }));
    });

    it('popup mode: dispatches completed(false) on reject', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c', {
              a: [],
              b: [],
              c: [popupView],
            }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [] }),
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('popup mode: dismisses the prompt without authorizing when the request is cancelled (connection dropped)', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: hot('- 300ms a', {
              a: {
                type: 'authorizeDapp/failed',
                payload: { dapp: mockDapp, reason: 'connection dropped' },
              },
            }),
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            // cold replays [popupView] per subscription (like the
            // BehaviorSubject-backed selector), so the cancellation watch's
            // late re-subscription still finds the window to close.
            selectOpenViews$: cold('a', { a: [popupView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [] }),
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.views.closeView).toHaveBeenCalledWith(
            popupView.id,
          );
          expect(
            deps.actions.cardanoDappConnector.clearPendingAuthRequest,
          ).toHaveBeenCalled();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).not.toHaveBeenCalled();
          expect(deps.actions.authorizeDapp.completed).not.toHaveBeenCalled();
        },
      }));
    });

    it('popup mode: dismisses the prompt when the request is cancelled before the popup window registers', () => {
      // The cancellation watch must be active immediately — a drop can arrive
      // while the popup is still opening (before selectOpenViews$ reports it),
      // else the stale popup stays confirmable after the contract denied.
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            // Failure fires at ~130ms — after the popup is requested (~110ms,
            // post-debounce) but before its window registers (~160ms).
            failed$: hot('- 130ms a', {
              a: {
                type: 'authorizeDapp/failed',
                payload: { dapp: mockDapp, reason: 'connection dropped' },
              },
            }),
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c', {
              a: [],
              b: [],
              c: [popupView],
            }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [] }),
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.views.closeView).toHaveBeenCalledWith(
            popupView.id,
          );
          expect(
            deps.actions.cardanoDappConnector.clearPendingAuthRequest,
          ).toHaveBeenCalled();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).not.toHaveBeenCalled();
          expect(deps.actions.authorizeDapp.completed).not.toHaveBeenCalled();
        },
      }));
    });

    it('popup mode: dispatches completed(false) on view closure', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: hot('- 300ms a', {
              a: {
                type: 'views/viewDisconnected',
                payload: popupView.id,
              },
            }),
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: hot('a 110ms b 50ms c 50ms d', {
              a: [],
              b: [],
              c: [popupView],
              d: [],
            }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [] }),
            selectAll$: hot('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: false,
            dapp: mockDapp,
          });
        },
      }));
    });

    it('debounces rapid requests', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-ab', {
              a: startAction(1),
              b: startAction(1),
            }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: hot('- 300ms a', {
              a: {
                type: 'cardanoDappConnector/rejectConnect',
                payload: undefined,
              },
            }),
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: cold('a', {
              a: {} as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: cold('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: cold('a', { a: [] }),
            selectAll$: cold('a', { a: [] }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.setPendingAuthRequest,
          ).toHaveBeenCalledTimes(1);
        },
      }));
    });

    it('auto-grants without UI when dapp is persisted and only one wallet with one Cardano account exists', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: { selectOpenViews$: hot('a', { a: [] }) },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {
                Cardano: [{ dapp: { origin: mockDapp.origin } }],
              } as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [mockAccount] }),
            selectAll$: hot('a', {
              a: [{ walletId: 'wallet-1' } as unknown as AnyWallet],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          expect(
            deps.actions.cardanoDappConnector.setPendingAuthRequest,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              requestId: `auto-${mockDapp.origin}`,
              dappOrigin: mockDapp.origin,
            }),
          );
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: mockAccount,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
          // No UI dispatches
          expect(deps.actions.views.setActiveSheetPage).not.toHaveBeenCalled();
          expect(deps.actions.views.openView).not.toHaveBeenCalled();
        },
      }));
    });

    it('falls through to UI when persisted but multi-account', () => {
      const deps = createTestDependencies();
      const secondAccount = {
        accountId: 'account-2',
        blockchainName: 'Cardano',
      } as unknown as AnyAccount;
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {
                Cardano: [{ dapp: { origin: mockDapp.origin } }],
              } as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', {
              a: [mockAccount, secondAccount],
            }),
            selectAll$: hot('a', {
              a: [{ walletId: 'wallet-1' } as unknown as AnyWallet],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          // UI path dispatches setActiveSheetPage (sidePanel mode)
          expect(deps.actions.views.setActiveSheetPage).toHaveBeenCalled();
          // No auto-grant confirmAuth/completed yet (waiting for user)
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).not.toHaveBeenCalled();
          expect(deps.actions.authorizeDapp.completed).not.toHaveBeenCalled();
        },
      }));
    });

    it('falls through to UI when persisted with one Cardano account but multiple wallets', () => {
      const deps = createTestDependencies();
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, cold, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction(1) }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: {
            selectOpenViews$: cold('a', { a: [sidePanelView] }),
          },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {
                Cardano: [{ dapp: { origin: mockDapp.origin } }],
              } as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', { a: {} }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', { a: [mockAccount] }),
            selectAll$: hot('a', {
              a: [
                { walletId: 'wallet-1' } as unknown as AnyWallet,
                { walletId: 'wallet-2' } as unknown as AnyWallet,
              ],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          // UI shown even with 1 Cardano account because there are
          // multiple wallets and the user must pick which to connect.
          expect(deps.actions.views.setActiveSheetPage).toHaveBeenCalled();
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).not.toHaveBeenCalled();
          expect(deps.actions.authorizeDapp.completed).not.toHaveBeenCalled();
        },
      }));
    });

    it('auto-grants without UI when persisted and an account was already selected for the origin (multi-account)', () => {
      const deps = createTestDependencies();
      const secondAccount = {
        accountId: 'account-2',
        blockchainName: 'Cardano',
      } as unknown as AnyAccount;
      testSideEffect(promptCardanoAuthorizeDapp, ({ hot, flush }) => ({
        actionObservables: {
          authorizeDapp: {
            start$: hot('-a', { a: startAction() }),
            completed$: NEVER,
            failed$: NEVER,
          },
          cardanoDappConnector: {
            confirmConnect$: NEVER,
            rejectConnect$: NEVER,
          },
          views: {
            viewDisconnected$: NEVER,
            locationChanged$: NEVER,
          },
        },
        stateObservables: {
          views: { selectOpenViews$: hot('a', { a: [] }) },
          dappConnector: {
            selectAuthorizedDapps$: hot('a', {
              a: {
                Cardano: [{ dapp: { origin: mockDapp.origin } }],
              } as AuthorizedDappsDataSlice,
            }),
          },
          cardanoDappConnector: {
            selectSessionAccountByOrigin$: hot('a', {
              a: { [mockDapp.origin]: secondAccount.accountId },
            }),
          },
          wallets: {
            selectActiveNetworkAccounts$: hot('a', {
              a: [mockAccount, secondAccount],
            }),
            selectAll$: hot('a', {
              a: [{ walletId: 'wallet-1' } as unknown as AnyWallet],
            }),
          },
        },
        dependencies: deps,
        assertion: sideEffect$ => {
          sideEffect$.subscribe();
          flush();
          // Re-uses the previously selected account; no UI shown.
          expect(
            deps.actions.cardanoDappConnector.confirmAuth,
          ).toHaveBeenCalledWith({
            authorized: true,
            account: secondAccount,
          });
          expect(deps.actions.authorizeDapp.completed).toHaveBeenCalledWith({
            authorized: true,
            dapp: mockDapp,
            blockchainName: 'Cardano',
          });
          expect(deps.actions.views.setActiveSheetPage).not.toHaveBeenCalled();
          expect(deps.actions.views.openView).not.toHaveBeenCalled();
        },
      }));
    });
  });

  describe('closeRequestedSheet', () => {
    const runCloseRequested = (activeSheetPage: unknown) => {
      const closeSheetRequested$ = new Subject<{
        payload: { requestId?: string };
      }>();
      const emissions: unknown[] = [];
      closeRequestedSheet(
        { cardanoDappConnector: { closeSheetRequested$ } } as never,
        { views: { getActiveSheetPage$: of(activeSheetPage) } } as never,
        {
          actions: {
            views: {
              setActiveSheetPage: (page: unknown) => ({
                type: 'views/setActiveSheetPage',
                payload: page,
              }),
            },
          },
        } as never,
      ).subscribe(emission => emissions.push(emission));
      return { closeSheetRequested$, emissions };
    };

    const sheetShowing = (requestId: string) => ({
      route: 'SignTx',
      params: { requestId },
      targetViewId: 'side-panel-1',
    });

    // The side effect decides one task after the action arrives, so the
    // assertion has to let that task run.
    const settled = async () => new Promise(resolve => setTimeout(resolve, 0));

    const dismissAction = { type: 'views/setActiveSheetPage', payload: null };

    it('dismisses the sheet the asking request still holds', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested(
        sheetShowing('request-a'),
      );

      closeSheetRequested$.next({ payload: { requestId: 'request-a' } });
      await settled();

      expect(emissions).toEqual([dismissAction]);
    });

    it('keeps the sheet a queued request has taken over', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested(
        sheetShowing('request-b'),
      );

      closeSheetRequested$.next({ payload: { requestId: 'request-a' } });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('keeps an unrelated sheet that names no request', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested({
        route: 'AuthorizeDapp',
        params: { dapp: { origin: 'https://dapp.example' } },
        targetViewId: 'side-panel-1',
      });

      closeSheetRequested$.next({ payload: { requestId: 'request-a' } });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('emits nothing when no sheet is presented', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested(null);

      closeSheetRequested$.next({ payload: { requestId: 'request-a' } });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('ignores a close that names no request', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested(
        sheetShowing('request-a'),
      );

      closeSheetRequested$.next({ payload: {} });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('keeps an unrelated sheet from a close that also names no request', async () => {
      const { closeSheetRequested$, emissions } = runCloseRequested({
        route: 'AuthorizeDapp',
        params: { dapp: { origin: 'https://dapp.example' } },
        targetViewId: 'side-panel-1',
      });

      closeSheetRequested$.next({ payload: {} });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('decides after the queue has had a task to claim the sheet', async () => {
      // The slot still holds the answered request when the close arrives, and
      // the successor claims it a task later — the real ordering that makes an
      // arrival-time read dismiss the sheet the successor was just given.
      const activeSheetPage$ = new BehaviorSubject<unknown>(
        sheetShowing('request-a'),
      );
      const closeSheetRequested$ = new Subject<{
        payload: { requestId?: string };
      }>();
      const emissions: unknown[] = [];
      closeRequestedSheet(
        { cardanoDappConnector: { closeSheetRequested$ } } as never,
        { views: { getActiveSheetPage$: activeSheetPage$ } } as never,
        {
          actions: {
            views: {
              setActiveSheetPage: (page: unknown) => ({
                type: 'views/setActiveSheetPage',
                payload: page,
              }),
            },
          },
        } as never,
      ).subscribe(emission => emissions.push(emission));

      closeSheetRequested$.next({ payload: { requestId: 'request-a' } });
      activeSheetPage$.next(sheetShowing('request-b'));
      await settled();

      expect(emissions).toEqual([]);
    });
  });

  describe('closeRequestedPopup', () => {
    const popupViewId = ViewId('sign-tx-popup');
    const signTxPopup = {
      id: popupViewId,
      type: 'popupWindow' as const,
      location: CARDANO_DAPP_SIGN_TX_LOCATION,
    };

    const runCloseRequested = (
      openViews: unknown[],
      pendingSignTxRequest: { requestId: string } | null = null,
    ) => {
      const closePopupRequested$ = new Subject<{
        payload: { location: string; requestId?: string };
      }>();
      const emissions: unknown[] = [];
      closeRequestedPopup(
        { cardanoDappConnector: { closePopupRequested$ } } as never,
        {
          views: { selectOpenViews$: of(openViews) },
          cardanoDappConnector: {
            selectPendingSignTxRequest$: of(pendingSignTxRequest),
            selectPendingSignDataRequest$: of(null),
          },
        } as never,
        {
          actions: {
            views: {
              closeView: (id: unknown) => ({
                type: 'views/closeView',
                payload: id,
              }),
            },
          },
        } as never,
      ).subscribe(emission => emissions.push(emission));
      return { closePopupRequested$, emissions };
    };

    // The side effect decides one task after the action arrives, so the
    // assertion has to let that task run.
    const settled = async () => new Promise(resolve => setTimeout(resolve, 0));

    const closeViewAction = { type: 'views/closeView', payload: popupViewId };

    it('closes the popup window open at the requested location', async () => {
      const { closePopupRequested$, emissions } = runCloseRequested([
        { id: ViewId('side-panel'), type: 'sidePanel', location: '/' },
        signTxPopup,
      ]);

      closePopupRequested$.next({
        payload: { location: CARDANO_DAPP_SIGN_TX_LOCATION },
      });
      await settled();

      expect(emissions).toEqual([closeViewAction]);
    });

    it('emits nothing when no popup window is open at that location', async () => {
      const { closePopupRequested$, emissions } = runCloseRequested([
        {
          id: ViewId('side-panel'),
          type: 'sidePanel',
          location: CARDANO_DAPP_SIGN_TX_LOCATION,
        },
      ]);

      closePopupRequested$.next({
        payload: { location: CARDANO_DAPP_SIGN_TX_LOCATION },
      });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('keeps the window open for a queued request that has taken it over', async () => {
      const { closePopupRequested$, emissions } = runCloseRequested(
        [signTxPopup],
        { requestId: 'request-b' },
      );

      closePopupRequested$.next({
        payload: {
          location: CARDANO_DAPP_SIGN_TX_LOCATION,
          requestId: 'request-a',
        },
      });
      await settled();

      expect(emissions).toEqual([]);
    });

    it('closes the window when the request that asked still holds it', async () => {
      const { closePopupRequested$, emissions } = runCloseRequested(
        [signTxPopup],
        { requestId: 'request-a' },
      );

      closePopupRequested$.next({
        payload: {
          location: CARDANO_DAPP_SIGN_TX_LOCATION,
          requestId: 'request-a',
        },
      });
      await settled();

      expect(emissions).toEqual([closeViewAction]);
    });

    it('closes the window for a view that never showed a request', async () => {
      const { closePopupRequested$, emissions } = runCloseRequested(
        [signTxPopup],
        { requestId: 'request-b' },
      );

      closePopupRequested$.next({
        payload: { location: CARDANO_DAPP_SIGN_TX_LOCATION },
      });
      await settled();

      expect(emissions).toEqual([closeViewAction]);
    });
  });

  describe('initializeSideEffects', () => {
    it('should return an array containing both extension side effects', () => {
      // initializeSideEffects doesn't use props or deps, so we can pass empty objects
      const sideEffects = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      expect(Array.isArray(sideEffects)).toBe(true);
      // connectCardanoDappConnectorApi: handles signTx/signData via handleRequests
      // promptCardanoAuthorizeDapp: handles enable() via authorizeDapp.start
      // resolveForeignTransactionInputs: resolves foreign inputs via Blockfrost
      // clearResolvedInputsOnSignTxClear: clears resolved inputs when signTx request is cleared
      // closeRequestedPopup: resolves closePopupRequested into views.closeView
      // closeRequestedSheet: resolves closeSheetRequested into setActiveSheetPage
      expect(sideEffects).toHaveLength(6);
      expect(sideEffects).toContain(connectCardanoDappConnectorApi);
      expect(sideEffects).toContain(promptCardanoAuthorizeDapp);
      expect(sideEffects).toContain(resolveForeignTransactionInputs);
      expect(sideEffects).toContain(clearResolvedInputsOnSignTxClear);
      expect(sideEffects).toContain(closeRequestedPopup);
      expect(sideEffects).toContain(closeRequestedSheet);
    });

    it('should return the same side effect function references', () => {
      const sideEffects1 = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );
      const sideEffects2 = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      expect(sideEffects1[0]).toBe(sideEffects2[0]);
      expect(sideEffects1[1]).toBe(sideEffects2[1]);
    });

    it('should return side effects that match the SideEffect type', () => {
      const sideEffects = initializeSideEffects(
        {} as Parameters<typeof initializeSideEffects>[0],
        {} as Parameters<typeof initializeSideEffects>[1],
      );

      for (const sideEffect of sideEffects) {
        expect(typeof sideEffect).toBe('function');
        // Verify it has the expected function signature (3 parameters)
        expect(sideEffect.length).toBe(3);
      }
    });
  });
});
