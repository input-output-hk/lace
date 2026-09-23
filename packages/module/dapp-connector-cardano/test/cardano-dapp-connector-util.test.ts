import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import {
  BehaviorSubject,
  concatMap,
  delay,
  mergeMap,
  NEVER,
  of,
  Subject,
} from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../src/browser/const';
import {
  closeRequestedPopup,
  closeRequestedSheet,
} from '../src/browser/store/side-effects';
import {
  findTargetSidePanel,
  signData$,
  signTx$,
} from '../src/browser/store/util';
import { createCardanoConfirmationCallback } from '../src/common/store/dependencies/create-confirmation-callback';
import { cardanoDappConnectorActions } from '../src/common/store/slice';

import type {
  CardanoConfirmationRequest,
  CardanoConfirmationResult,
} from '../src/common/store/dependencies/create-confirmation-callback';
import type { SignRequestAnswer } from '../src/common/store/slice';
import type { ActionCreators } from '../src/index';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { View } from '@lace-contract/views';
import type { DisconnectEvent } from '@lace-lib/extension-messaging';
import type { Observable, Subscriber } from 'rxjs';
import type { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import type { Mock } from 'vitest';
import type { Runtime } from 'webextension-polyfill';

// Stub chrome.sidePanel API so findTargetSidePanel reports it as available.
// The real browser provides this; tests run in node so we have to set it.
(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

// Shared test fixtures
const mockDapp: Dapp = {
  id: DappId('https://test-dapp.com'),
  name: 'Test DApp',
  origin: 'https://test-dapp.com',
  imageUrl: 'https://test-dapp.com/favicon.ico',
};

// DappInfo type for Redux state (matches unified DappInfo)
const mockDappInfo = {
  name: mockDapp.name,
  origin: mockDapp.origin,
  imageUrl: mockDapp.imageUrl,
};

/** The action shape the flows receive on their confirm and reject streams. */
type SignAnswer = { payload: SignRequestAnswer };

/**
 * An answer that names no request, as a view that never synced one dispatches
 * it. Honoured by whichever request holds the queue's head.
 */
const unattributedAnswer: SignAnswer = { payload: {} };

const actions = {
  ...cardanoDappConnectorActions,
  ...viewsActions,
  ...authenticationPromptActions,
} as unknown as ActionCreators;

/** Lets the store's one-task side-effect hop drain. */
const nextTask = async () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * A request id ends in a uniqueness counter whose value depends on how many
 * requests the module has already stamped, so tests pin the stable prefix.
 */
const requestIdFor = (type: string) =>
  expect.stringContaining(
    `${mockDapp.origin}-${type}-12345-`,
  ) as unknown as string;

/** A dApp port drop, as `createCardanoConfirmationCallback` reports one. */
const portDrop: DisconnectEvent = {
  disconnected: {
    sender: { url: mockDapp.origin } as unknown as Runtime.MessageSender,
    postMessage: () => {},
  },
  remaining: [],
};

const createView = (location: string): View => ({
  id: ViewId('view1'),
  location,
  type: 'popupWindow',
});

const createSidePanelView = (windowId = 1): View => ({
  id: ViewId('sidePanel1'),
  location: '/side-panel',
  type: 'sidePanel',
  windowId,
});

// Test configuration for parameterized tests

type FlowConfig = {
  name: string;
  location: string;
  createRequest: (resolve: Mock) => CardanoConfirmationRequest;
  invoke: (params: {
    request: CardanoConfirmationRequest;
    selectOpenViews$: ColdObservable<View[]>;
    confirm$: ColdObservable<SignAnswer>;
    reject$: ColdObservable<SignAnswer>;
    signingResult$?: Subject<{ type: 'cancelled' | 'error' | 'success' }>;
    viewDisconnected$?: Subject<{ payload: ViewId }>;
  }) => void;
  requiresAuth: boolean;
};

const flowConfigs: FlowConfig[] = [
  {
    name: 'signTx$',
    location: CARDANO_DAPP_SIGN_TX_LOCATION,
    requiresAuth: true,
    createRequest: resolve =>
      ({
        resolve,
        type: 'signTx',
        collateralRefusal: null,
        requestingDapp: mockDapp,
        txHex: 'deadbeef1234',
        partialSign: false,
      } as CardanoConfirmationRequest),
    invoke: ({
      request,
      selectOpenViews$,
      confirm$,
      reject$,
      signingResult$,
      viewDisconnected$,
    }) => {
      signTx$({
        request,
        selectOpenViews$,
        actions,
        confirmSignTx$: confirm$,
        rejectSignTx$: reject$,
        viewDisconnected$: viewDisconnected$!,
        signingResult$: signingResult$!,
      }).subscribe();
    },
  },
  {
    name: 'signData$',
    location: CARDANO_DAPP_SIGN_DATA_LOCATION,
    requiresAuth: true,
    createRequest: resolve =>
      ({
        resolve,
        type: 'signData',
        collateralRefusal: null,
        requestingDapp: mockDapp,
        signDataAddress: 'addr_test1qz...',
        signDataPayload: 'cafebabe',
      } as CardanoConfirmationRequest),
    invoke: ({
      request,
      selectOpenViews$,
      confirm$,
      reject$,
      signingResult$,
      viewDisconnected$,
    }) => {
      signData$({
        request,
        selectOpenViews$,
        actions,
        confirmSignData$: confirm$,
        rejectSignData$: reject$,
        viewDisconnected$: viewDisconnected$!,
        signingResult$: signingResult$!,
      }).subscribe();
    },
  },
];

describe('findTargetSidePanel', () => {
  // Restore the stub the rest of this test file installs at module scope.
  const restoreSidePanelStub = () => {
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { setPanelBehavior: () => {} },
    };
  };

  beforeEach(restoreSidePanelStub);

  it('returns undefined when chrome.sidePanel API is unavailable', () => {
    (globalThis as { chrome?: unknown }).chrome = {};
    const sidePanel = createSidePanelView(1);
    expect(findTargetSidePanel([sidePanel], 1)).toBeUndefined();
  });

  it('returns undefined when side panel is supported but no panel is open', () => {
    expect(findTargetSidePanel([], 1)).toBeUndefined();
  });

  it('returns undefined when only non-side-panel views are open', () => {
    const popup = createView('/some-popup');
    expect(findTargetSidePanel([popup], 1)).toBeUndefined();
  });

  it('returns undefined when the only open side panel is in a different window', () => {
    const sidePanelInOtherWindow = createSidePanelView(2);
    expect(findTargetSidePanel([sidePanelInOtherWindow], 1)).toBeUndefined();
  });

  it('returns the side panel matching the requested windowId', () => {
    const sidePanel = createSidePanelView(1);
    expect(findTargetSidePanel([sidePanel], 1)).toBe(sidePanel);
  });

  it('returns the first side panel when no windowId is provided', () => {
    const sidePanel = createSidePanelView(7);
    expect(findTargetSidePanel([sidePanel])).toBe(sidePanel);
  });
});

describe('cardano-dapp-connector-util', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  // Parameterized tests for rejection and popup closure (shared behavior)
  describe.each(flowConfigs)('$name rejection and closure', config => {
    it('resolves with outcome rejected when user rejects', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = config.createRequest(resolveFunction);
        const view = createView(config.location);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        config.invoke({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          confirm$: cold('---'),
          reject$: cold('--a', { a: unattributedAnswer }),
          ...(config.requiresAuth && { signingResult$, viewDisconnected$ }),
        });
        flush();

        expect(resolveFunction).toHaveBeenCalledWith(
          expect.objectContaining({ outcome: 'rejected' }),
        );
      });
    });

    it('resolves with outcome rejected when popup is closed', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = config.createRequest(resolveFunction);
        const view = createView(config.location);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        config.invoke({
          request,
          selectOpenViews$: cold('-a-b', { a: [view], b: [] }),
          confirm$: cold('----'),
          reject$: cold('----'),
          ...(config.requiresAuth && { signingResult$, viewDisconnected$ }),
        });
        flush();

        expect(resolveFunction).toHaveBeenCalledWith(
          expect.objectContaining({ outcome: 'rejected' }),
        );
      });
    });
  });

  /**
   * The pieces of a flow the queued-handover scenario drives. Separate from
   * `flowConfigs`, which subscribes for its caller and serves one request.
   */
  type QueuedFlowConfig = {
    name: string;
    location: string;
    pendingRequestAction: string;
    createRequest: (
      resolve: Mock,
      disconnected$?: Observable<DisconnectEvent>,
    ) => CardanoConfirmationRequest;
    invoke: (params: {
      request: CardanoConfirmationRequest;
      selectOpenViews$: Observable<View[]>;
      confirm$: Observable<SignAnswer>;
      reject$: Observable<SignAnswer>;
    }) => Observable<unknown>;
  };

  const queuedFlowConfigs: QueuedFlowConfig[] = [
    {
      name: 'signTx$',
      location: CARDANO_DAPP_SIGN_TX_LOCATION,
      pendingRequestAction: 'cardanoDappConnector/setPendingSignTxRequest',
      createRequest: (resolve, disconnected$) =>
        ({
          resolve,
          disconnected$,
          type: 'signTx',
          requestingDapp: mockDapp,
          txHex: 'deadbeef1234',
          partialSign: false,
          collateralRefusal: null,
        } as CardanoConfirmationRequest),
      invoke: ({ request, selectOpenViews$, confirm$, reject$ }) =>
        signTx$({
          request,
          selectOpenViews$,
          actions,
          confirmSignTx$: confirm$,
          rejectSignTx$: reject$,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }),
    },
    {
      name: 'signData$',
      location: CARDANO_DAPP_SIGN_DATA_LOCATION,
      pendingRequestAction: 'cardanoDappConnector/setPendingSignDataRequest',
      createRequest: (resolve, disconnected$) =>
        ({
          resolve,
          disconnected$,
          type: 'signData',
          requestingDapp: mockDapp,
          signDataAddress: 'addr_test1qz...',
          signDataPayload: 'cafebabe',
          collateralRefusal: null,
        } as CardanoConfirmationRequest),
      invoke: ({ request, selectOpenViews$, confirm$, reject$ }) =>
        signData$({
          request,
          selectOpenViews$,
          actions,
          confirmSignData$: confirm$,
          rejectSignData$: reject$,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }),
    },
  ];

  /**
   * Both surfaces reach the same flow through different arms of its race, and
   * only the popup one has a dismissal fallback that the filter cannot touch —
   * so the sheet arms are the ones that must be driven with a named answer.
   */
  const promptSurfaces = [
    {
      surface: 'popup window',
      openViews: (location: string) => [createView(location)],
    },
    {
      surface: 'side panel',
      openViews: () => [createSidePanelView(1)],
    },
  ];

  const attributionCases = queuedFlowConfigs.flatMap(flow =>
    promptSurfaces.map(surface => ({ ...flow, ...surface })),
  );

  describe.each(attributionCases)(
    '$name answer attribution in the $surface',
    flow => {
      /**
       * Queues two requests through the same `concatMap` the production queue
       * uses, on one prompt both of them share, then drops the first request's
       * port — so the second inherits that prompt and its answer streams while
       * the first request's answer is still travelling from the view.
       */
      const startHandover = () => {
        const resolveA = vi.fn();
        const resolveB = vi.fn();
        const confirm$ = new Subject<SignAnswer>();
        const reject$ = new Subject<SignAnswer>();
        const portDropped$ = new Subject<DisconnectEvent>();
        const request$ = new Subject<CardanoConfirmationRequest>();
        const promptedIds: string[] = [];

        request$
          .pipe(
            concatMap(request =>
              flow.invoke({
                request,
                selectOpenViews$: of(flow.openViews(flow.location)),
                confirm$,
                reject$,
              }),
            ),
          )
          .subscribe(emission => {
            const { type, payload } = emission as {
              type: string;
              payload?: { requestId?: string };
            };
            if (type === flow.pendingRequestAction && payload?.requestId) {
              promptedIds.push(payload.requestId);
            }
          });

        request$.next(flow.createRequest(resolveA, portDropped$));
        request$.next(flow.createRequest(resolveB));
        portDropped$.next(portDrop);

        // Without two prompts there is no handover to test, and an id read from
        // an empty slot would be `undefined` — which every request accepts.
        expect(promptedIds).toHaveLength(2);

        return { resolveA, resolveB, confirm$, reject$, promptedIds };
      };

      it('does not let a confirm naming the dropped request answer its successor', () => {
        const { resolveA, resolveB, confirm$, promptedIds } = startHandover();

        confirm$.next({ payload: { requestId: promptedIds[0] } });

        expect(resolveA).toHaveBeenCalledExactlyOnceWith({
          outcome: 'disconnected',
        });
        expect(resolveB).not.toHaveBeenCalled();

        confirm$.next({ payload: { requestId: promptedIds[1] } });
        expect(resolveB).toHaveBeenCalledExactlyOnceWith({
          outcome: 'confirmed',
        });
      });

      it('does not let a reject naming the dropped request answer its successor', () => {
        const { resolveA, resolveB, reject$, promptedIds } = startHandover();

        reject$.next({ payload: { requestId: promptedIds[0] } });

        expect(resolveA).toHaveBeenCalledExactlyOnceWith({
          outcome: 'disconnected',
        });
        expect(resolveB).not.toHaveBeenCalled();

        reject$.next({ payload: { requestId: promptedIds[1] } });
        expect(resolveB).toHaveBeenCalledExactlyOnceWith({
          outcome: 'rejected',
        });
      });
    },
  );

  /**
   * Drives the real flow and the real close guard against one slot, so the
   * ordering under test is the one production produces rather than one the
   * test staged.
   */
  describe('dismissing a sheet with a request queued behind it', () => {
    const setActiveSheetPageType = (
      actions.views.setActiveSheetPage(null) as { type: string }
    ).type;
    const pendingSignTxType = 'cardanoDappConnector/setPendingSignTxRequest';

    const startQueuedSheet = () => {
      const resolveA = vi.fn();
      const resolveB = vi.fn();
      const reject$ = new Subject<SignAnswer>();
      const request$ = new Subject<CardanoConfirmationRequest>();
      const closeSheetRequested$ = new Subject<{
        payload: { requestId?: string };
      }>();
      const activeSheetPage$ = new BehaviorSubject<unknown>(null);
      const promptedIds: string[] = [];

      const applyEmission = (emission: unknown) => {
        const { type, payload } = emission as {
          type: string;
          payload?: { requestId?: string };
        };
        if (type === setActiveSheetPageType) {
          activeSheetPage$.next(payload ?? null);
        }
        if (type === pendingSignTxType && payload?.requestId) {
          promptedIds.push(payload.requestId);
        }
      };

      request$
        .pipe(
          concatMap(request =>
            signTx$({
              request,
              selectOpenViews$: of([createSidePanelView(1)]),
              actions,
              confirmSignTx$: NEVER,
              rejectSignTx$: reject$,
              viewDisconnected$: NEVER,
              signingResult$: NEVER,
            }),
          ),
        )
        .subscribe(applyEmission);

      closeRequestedSheet(
        { cardanoDappConnector: { closeSheetRequested$ } } as never,
        { views: { getActiveSheetPage$: activeSheetPage$ } } as never,
        { actions } as never,
      ).subscribe(applyEmission);

      const createRequest = (
        resolve: (result: CardanoConfirmationResult) => void,
      ): CardanoConfirmationRequest =>
        ({
          resolve,
          type: 'signTx',
          requestingDapp: mockDapp,
          txHex: 'deadbeef',
          partialSign: false,
        } as CardanoConfirmationRequest);

      request$.next(createRequest(resolveA));
      request$.next(createRequest(resolveB));

      expect(promptedIds).toHaveLength(1);

      return {
        resolveA,
        resolveB,
        reject$,
        closeSheetRequested$,
        activeSheetPage$,
        promptedIds,
      };
    };

    it('serves the queued request its own sheet when the dismissal is answered first', async () => {
      const {
        resolveA,
        reject$,
        closeSheetRequested$,
        activeSheetPage$,
        promptedIds,
      } = startQueuedSheet();
      const dismissed = promptedIds[0];

      reject$.next({ payload: { requestId: dismissed } });
      closeSheetRequested$.next({ payload: { requestId: dismissed } });
      await nextTask();

      expect(resolveA).toHaveBeenCalledExactlyOnceWith({
        outcome: 'rejected',
      });
      expect(promptedIds).toHaveLength(2);
      expect(activeSheetPage$.value).toMatchObject({
        params: { requestId: promptedIds[1] },
      });
    });

    it('serves the queued request its own sheet when the dismissal is still in flight', async () => {
      const {
        resolveA,
        reject$,
        closeSheetRequested$,
        activeSheetPage$,
        promptedIds,
      } = startQueuedSheet();
      const dismissed = promptedIds[0];

      // The close is already travelling when the answer frees the queue, so
      // the successor claims the sheet before the close is decided.
      closeSheetRequested$.next({ payload: { requestId: dismissed } });
      reject$.next({ payload: { requestId: dismissed } });
      await nextTask();

      expect(resolveA).toHaveBeenCalledExactlyOnceWith({
        outcome: 'rejected',
      });
      expect(activeSheetPage$.value).toMatchObject({
        params: { requestId: promptedIds[1] },
      });
    });

    it('dismisses the sheet when nothing is queued behind it', async () => {
      const resolve = vi.fn();
      const reject$ = new Subject<SignAnswer>();
      const closeSheetRequested$ = new Subject<{
        payload: { requestId?: string };
      }>();
      const activeSheetPage$ = new BehaviorSubject<unknown>(null);
      const promptedIds: string[] = [];

      const applyEmission = (emission: unknown) => {
        const { type, payload } = emission as {
          type: string;
          payload?: { requestId?: string };
        };
        if (type === setActiveSheetPageType)
          activeSheetPage$.next(payload ?? null);
        if (type === pendingSignTxType && payload?.requestId) {
          promptedIds.push(payload.requestId);
        }
      };

      signTx$({
        request: {
          resolve,
          type: 'signTx',
          requestingDapp: mockDapp,
          txHex: 'deadbeef',
          partialSign: false,
          collateralRefusal: null,
        } as CardanoConfirmationRequest,
        selectOpenViews$: of([createSidePanelView(1)]),
        actions,
        confirmSignTx$: NEVER,
        rejectSignTx$: reject$,
        viewDisconnected$: NEVER,
        signingResult$: NEVER,
      }).subscribe(applyEmission);

      closeRequestedSheet(
        { cardanoDappConnector: { closeSheetRequested$ } } as never,
        { views: { getActiveSheetPage$: activeSheetPage$ } } as never,
        { actions } as never,
      ).subscribe(applyEmission);

      reject$.next({ payload: { requestId: promptedIds[0] } });
      closeSheetRequested$.next({ payload: { requestId: promptedIds[0] } });
      await nextTask();

      expect(resolve).toHaveBeenCalledExactlyOnceWith({ outcome: 'rejected' });
      expect(activeSheetPage$.value).toBeNull();
    });
  });

  // Flow-specific tests
  describe('signTx$', () => {
    const createSignTxRequest = (
      resolveFunction: (result: CardanoConfirmationResult) => void,
    ): CardanoConfirmationRequest => ({
      resolve: resolveFunction,
      type: 'signTx',
      collateralRefusal: null,
      requestingDapp: mockDapp,
      txHex: 'deadbeef1234',
      partialSign: false,
    });

    it('opens popup view and stores signTx request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12345);
      testScheduler.run(({ hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signTx$({
          request,
          selectOpenViews$: hotObs('a', {
            a: [signTxView] as View[],
          }),
          actions,
          confirmSignTx$: hotObs('-'),
          rejectSignTx$: hotObs('-'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.views.openView({
              type: 'popupWindow',
              location: CARDANO_DAPP_SIGN_TX_LOCATION,
            }),
            actions.cardanoDappConnector.setPendingSignTxRequest({
              requestId: requestIdFor('signTx'),
              dappOrigin: mockDapp.origin,
              dapp: mockDappInfo,
              txHex: 'deadbeef1234',
              partialSign: false,
              // `signTx$` is the REVIEWABLE flow, so the guard verdict it
              // carries is always null (the refused flow is `refusedSignTx$`).
              // Required field, compile-enforced.
              collateralRefusal: null,
            }),
          ]),
        );
      });
    });

    it('dispatches setSignTxCompleted on successful signing in popup mode', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signTx$({
          request,
          selectOpenViews$: cold('-a', { a: [signTxView] }),
          actions,
          confirmSignTx$: cold('--a', { a: unattributedAnswer }),
          rejectSignTx$: cold('----'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));

        // Confirm triggers, then signing succeeds
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxCompleted(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
      });
    });

    it('lets the signing result stand when the user rejects after confirming in popup mode', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signTx$({
          request,
          selectOpenViews$: cold('-a', { a: [signTxView] }),
          actions,
          confirmSignTx$: cold('--a', { a: unattributedAnswer }),
          // Cancel stays enabled while the signer runs.
          rejectSignTx$: cold('---a', { a: unattributedAnswer }),
          viewDisconnected$,
          signingResult$,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(resolveFunction).not.toHaveBeenCalledWith({
          outcome: 'rejected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxCompleted(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('does not answer a queued request when its predecessor closes their shared window', async () => {
      const resolveA = vi.fn();
      const resolveB = vi.fn();
      const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
      const rejectSignTx$ = new Subject<SignAnswer>();
      const viewDisconnected$ = new Subject<{ payload: ViewId }>();
      const request$ = new Subject<CardanoConfirmationRequest>();
      const closePopupRequested$ = new Subject<{
        payload: { location: string; requestId?: string };
      }>();

      // Enough of the store for the real close side effect to consult: which
      // views are open, and which request holds the sign-tx location.
      const openViews$ = new BehaviorSubject<View[]>([signTxView]);
      const pendingSignTxRequest$ = new BehaviorSubject<{
        requestId: string;
      } | null>(null);
      const pendingRequestIds: string[] = [];
      const dispatched: string[] = [];

      const apply = (action: unknown) => {
        const { type, payload } = action as { type: string; payload?: unknown };
        dispatched.push(type);
        if (type === 'cardanoDappConnector/setPendingSignTxRequest') {
          const request = payload as { requestId: string };
          pendingRequestIds.push(request.requestId);
          pendingSignTxRequest$.next(request);
        }
        if (type === 'cardanoDappConnector/clearPendingSignTxRequest') {
          pendingSignTxRequest$.next(null);
        }
        if (type === 'cardanoDappConnector/closePopupRequested') {
          closePopupRequested$.next(
            action as { payload: { location: string; requestId?: string } },
          );
        }
        if (type === 'views/closeView') {
          openViews$.next(openViews$.value.filter(view => view.id !== payload));
          viewDisconnected$.next({ payload: payload as ViewId });
        }
      };

      // `delay(0)` on both subscriptions is not decoration: the store gives
      // every side effect's output exactly this hop (`toEpic` in
      // @lace-contract/module), which is why the handover is invisible to a
      // close decided the moment its action arrives.
      closeRequestedPopup(
        { cardanoDappConnector: { closePopupRequested$ } } as never,
        {
          views: { selectOpenViews$: openViews$ },
          cardanoDappConnector: {
            selectPendingSignTxRequest$: pendingSignTxRequest$,
            selectPendingSignDataRequest$: of(null),
          },
        } as never,
        { actions } as never,
      )
        .pipe(delay(0))
        .subscribe(apply);

      request$
        .pipe(
          concatMap(request =>
            signTx$({
              request,
              selectOpenViews$: openViews$,
              actions,
              confirmSignTx$: NEVER,
              rejectSignTx$,
              viewDisconnected$,
              signingResult$: NEVER,
            }),
          ),
          delay(0),
        )
        .subscribe(apply);

      request$.next(createSignTxRequest(resolveA));
      await nextTask();
      request$.next({ ...createSignTxRequest(resolveB), txHex: 'beefdead12' });
      await nextTask();

      // Cancel: the popup dispatches the reject first, which frees the queue
      // and binds the next request to this same window, and only then asks for
      // the window it was showing to be closed.
      rejectSignTx$.next(unattributedAnswer);
      closePopupRequested$.next({
        payload: {
          location: CARDANO_DAPP_SIGN_TX_LOCATION,
          requestId: pendingRequestIds[0],
        },
      });
      await nextTask();
      await nextTask();
      await nextTask();

      expect(resolveA).toHaveBeenCalledWith({ outcome: 'rejected' });
      expect(pendingRequestIds).toHaveLength(2);
      expect(dispatched).not.toContain('views/closeView');
      expect(openViews$.value).toEqual([signTxView]);
      expect(resolveB).not.toHaveBeenCalled();
    });

    it('does not answer a queued request when its predecessor cancels the password prompt', async () => {
      const resolveA = vi.fn();
      const resolveB = vi.fn();
      const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
      const confirmSignTx$ = new Subject<SignAnswer>();
      const signingResult$ = new Subject<{ type: 'cancelled' }>();
      const viewDisconnected$ = new Subject<{ payload: ViewId }>();
      const request$ = new Subject<CardanoConfirmationRequest>();
      const closePopupRequested$ = new Subject<{
        payload: { location: string; requestId?: string };
      }>();

      const openViews$ = new BehaviorSubject<View[]>([signTxView]);
      const pendingSignTxRequest$ = new BehaviorSubject<{
        requestId: string;
      } | null>(null);
      const pendingRequestIds: string[] = [];
      const dispatched: string[] = [];

      const apply = (action: unknown) => {
        const { type, payload } = action as { type: string; payload?: unknown };
        dispatched.push(type);
        if (type === 'cardanoDappConnector/setPendingSignTxRequest') {
          const request = payload as { requestId: string };
          pendingRequestIds.push(request.requestId);
          pendingSignTxRequest$.next(request);
        }
        if (type === 'cardanoDappConnector/clearPendingSignTxRequest') {
          pendingSignTxRequest$.next(null);
        }
        // The cancelled branch asks for the close instead of closing, so the
        // request has to reach the side effect the way the store delivers it.
        if (type === 'cardanoDappConnector/closePopupRequested') {
          closePopupRequested$.next(
            action as { payload: { location: string; requestId?: string } },
          );
        }
        if (type === 'views/closeView') {
          openViews$.next(openViews$.value.filter(view => view.id !== payload));
          viewDisconnected$.next({ payload: payload as ViewId });
        }
      };

      closeRequestedPopup(
        { cardanoDappConnector: { closePopupRequested$ } } as never,
        {
          views: { selectOpenViews$: openViews$ },
          cardanoDappConnector: {
            selectPendingSignTxRequest$: pendingSignTxRequest$,
            selectPendingSignDataRequest$: of(null),
          },
        } as never,
        { actions } as never,
      )
        .pipe(delay(0))
        .subscribe(apply);

      request$
        .pipe(
          concatMap(request =>
            signTx$({
              request,
              selectOpenViews$: openViews$,
              actions,
              confirmSignTx$,
              rejectSignTx$: NEVER,
              viewDisconnected$,
              signingResult$,
            }),
          ),
          delay(0),
        )
        .subscribe(apply);

      request$.next(createSignTxRequest(resolveA));
      await nextTask();
      request$.next({ ...createSignTxRequest(resolveB), txHex: 'beefdead12' });
      await nextTask();

      // Confirm, then abandon the password prompt: the signer reports
      // `cancelled` and the flow asks for its window back.
      confirmSignTx$.next(unattributedAnswer);
      signingResult$.next({ type: 'cancelled' });
      await nextTask();
      await nextTask();
      await nextTask();

      expect(resolveA).toHaveBeenCalledWith({ outcome: 'confirmed' });
      expect(pendingRequestIds).toHaveLength(2);
      expect(dispatched).not.toContain('views/closeView');
      expect(openViews$.value).toEqual([signTxView]);
      expect(resolveB).not.toHaveBeenCalled();
    });

    it('serves a queued second request in the window the first one used', () => {
      const resolveA = vi.fn();
      const resolveB = vi.fn();
      const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
      const confirmSignTx$ = new Subject<SignAnswer>();
      const signingResult$ = new Subject<{ type: 'success' }>();
      const request$ = new Subject<CardanoConfirmationRequest>();
      const emissions: unknown[] = [];

      request$
        .pipe(
          // Mirrors the queue in side-effects.ts: the next request is
          // subscribed synchronously when the previous flow completes.
          concatMap(request =>
            signTx$({
              request,
              // One window for both: openView highlights the popup already at
              // this location instead of opening a second one.
              selectOpenViews$: of([signTxView]),
              actions,
              confirmSignTx$,
              rejectSignTx$: NEVER,
              viewDisconnected$: NEVER,
              signingResult$,
            }),
          ),
        )
        .subscribe(emission => emissions.push(emission));

      request$.next(createSignTxRequest(resolveA));
      request$.next({ ...createSignTxRequest(resolveB), txHex: 'beefdead12' });

      confirmSignTx$.next(unattributedAnswer);
      signingResult$.next({ type: 'success' });

      expect(resolveA).toHaveBeenCalledWith({ outcome: 'confirmed' });
      const prompted = emissions
        .filter(
          (
            emission,
          ): emission is { payload: { txHex: string }; type: string } =>
            (emission as { type?: string }).type ===
            'cardanoDappConnector/setPendingSignTxRequest',
        )
        .map(action => action.payload.txHex);

      // The queued request is shown in that window rather than answered for
      // the user: binding to the previous request's popup must not settle it.
      expect(prompted).toEqual(['deadbeef1234', 'beefdead12']);
      expect(resolveB).not.toHaveBeenCalled();
    });

    it('fails the request and frees the queue when the popup view never registers', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signTx$({
          request,
          // The popup is asked for but never registers, so confirm and reject
          // can never arrive — they come from the view that never opened.
          selectOpenViews$: cold('a', { a: [] }),
          actions,
          confirmSignTx$: NEVER,
          rejectSignTx$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'unavailable',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxError(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('flips to error and resolves disconnected when the dApp drops while the prompt is open', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signTx$({
          request: {
            ...request,
            // Non-replaying, like the real relay Subject: the drop lands at
            // frame 2, after the view registered at frame 0.
            disconnected$: hotObs('--a', { a: undefined }),
          },
          selectOpenViews$: cold('a', { a: [signTxView] }),
          actions,
          confirmSignTx$: NEVER,
          rejectSignTx$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'disconnected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxError(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('lets the signing result stand when the dApp drops after confirm in popup mode', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);

        const emissions: unknown[] = [];
        signTx$({
          request: {
            ...request,
            disconnected$: hotObs('--a', { a: undefined }),
          },
          selectOpenViews$: cold('a', { a: [signTxView] }),
          actions,
          confirmSignTx$: cold('-a', { a: unattributedAnswer }),
          rejectSignTx$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: cold('---a', { a: { type: 'success' as const } }),
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxCompleted(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
        expect(emissions).not.toContainEqual(
          actions.cardanoDappConnector.setSignTxError(true),
        );
      });
    });

    it('catches a port disconnect that fires before the popup view registers', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);

        const emissions: unknown[] = [];
        signTx$({
          request: {
            ...request,
            // Non-replaying, like the real relay Subject: a cold marble would
            // replay on the late subscription and mask the gap under test.
            disconnected$: hotObs('--a', { a: undefined }),
          },
          // No side panel → popup branch; the sign view registers at frame 4,
          // after the disconnect fires at frame 2.
          selectOpenViews$: cold('a---b', { a: [], b: [signTxView] }),
          actions,
          confirmSignTx$: NEVER,
          rejectSignTx$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'disconnected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxError(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
      });
    });

    it('asks for the popup to close on confirm → cancelled, naming its own request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12_345);
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignTxRequest(resolveFunction);
        const signTxView = createView(CARDANO_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();

        const emissions: unknown[] = [];
        signTx$({
          request,
          selectOpenViews$: cold('a', { a: [signTxView] }),
          actions,
          confirmSignTx$: cold('--a', { a: unattributedAnswer }),
          rejectSignTx$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));

        testScheduler.flush();
        signingResult$.next({ type: 'cancelled' });

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.closePopupRequested({
              location: CARDANO_DAPP_SIGN_TX_LOCATION,
              requestId: requestIdFor('signTx'),
            }),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
        );
        expect(emissions).not.toContainEqual(
          actions.views.closeView(signTxView.id),
        );
      });
    });

    describe('sheet mode', () => {
      it('dispatches setSignTxCompleted on confirm → success', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('--a', { a: unattributedAnswer }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'success' });

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxCompleted(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('dispatches clearPendingSignTxRequest on confirm → cancelled', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('--a', { a: unattributedAnswer }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'cancelled' });

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('dispatches setSignTxError on confirm → error', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('--a', { a: unattributedAnswer }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'error' });

          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxError(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('dispatches clearPendingSignTxRequest on reject', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          let hasCompleted = false;
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: NEVER,
            rejectSignTx$: cold('--a', { a: unattributedAnswer }),
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe({
            next: emission => emissions.push(emission),
            complete: () => {
              hasCompleted = true;
            },
          });
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
          // Completion is what lets the serialized queue reach the next request.
          expect(hasCompleted).toBe(true);
        });
      });

      it('rejects and cleans up on panel closure via viewDisconnected$', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: NEVER,
            rejectSignTx$: NEVER,
            viewDisconnected$: cold('--a', {
              a: { payload: sidePanel.id },
            }),
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('flips to error and resolves disconnected on port disconnect', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signTx$({
            request: {
              ...request,
              windowId: 1,
              disconnected$: cold('--a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: NEVER,
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'disconnected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxError(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('confirm before a later disconnect wins the race', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signTx$({
            request: {
              ...request,
              windowId: 1,
              disconnected$: cold('----a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('-a', { a: unattributedAnswer }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: cold('--a', { a: { type: 'success' as const } }),
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(resolveFunction).not.toHaveBeenCalledWith({
            outcome: 'disconnected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxCompleted(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });

      it('lets the signing result stand when the user rejects after confirming', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          let hasCompleted = false;
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('-a', { a: unattributedAnswer }),
            // Cancel stays enabled while the signer runs.
            rejectSignTx$: cold('--a', { a: unattributedAnswer }),
            viewDisconnected$: NEVER,
            signingResult$: cold('---a', { a: { type: 'success' as const } }),
          }).subscribe({
            next: emission => emissions.push(emission),
            complete: () => {
              hasCompleted = true;
            },
          });
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(resolveFunction).not.toHaveBeenCalledWith({
            outcome: 'rejected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxCompleted(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
          // Completion is what lets the serialized queue reach the next request.
          expect(hasCompleted).toBe(true);
        });
      });

      it('lets the signing result stand when a disconnect lands after the user confirmed', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignTxRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signTx$({
            request: {
              ...request,
              windowId: 1,
              // The page dies at frame 2, while the signer is still working.
              disconnected$: cold('--a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: cold('-a', { a: unattributedAnswer }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: cold('---a', { a: { type: 'success' as const } }),
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          // The user authorised this signature and it succeeded, so that is
          // what they are shown. Tearing the flow down on the drop instead
          // would both mislabel a success as a failure and orphan the signing
          // result — which the next queued request would then consume as its
          // own, reporting a completed sign it never performed.
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignTxCompleted(true),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
          expect(emissions).not.toContainEqual(
            actions.cardanoDappConnector.setSignTxError(true),
          );
        });
      });

      it('lets the signing result stand when the real port stream drops after confirm', () => {
        const sender = {
          tab: { id: 1, windowId: 1 },
          url: mockDapp.origin,
        } as unknown as Runtime.MessageSender;
        const portDisconnected$ = new Subject<DisconnectEvent>();
        const confirmSignTx$ = new Subject<SignAnswer>();
        const signingResult$ = new Subject<{ type: 'success' }>();
        const emissions: unknown[] = [];

        const { callback } = createCardanoConfirmationCallback(
          request$ =>
            request$.pipe(
              mergeMap(request =>
                signTx$({
                  request,
                  selectOpenViews$: of([createSidePanelView(1)]),
                  actions,
                  confirmSignTx$,
                  rejectSignTx$: NEVER,
                  viewDisconnected$: NEVER,
                  signingResult$,
                }),
              ),
            ),
          {
            next: (emission: unknown) => emissions.push(emission),
          } as unknown as Subscriber<unknown>,
          portDisconnected$,
        );

        void callback(sender, 'signTx', {
          txHex: 'deadbeef1234',
          partialSign: false,
        });
        confirmSignTx$.next(unattributedAnswer);
        portDisconnected$.next({
          disconnected: { sender, postMessage: () => {} },
          remaining: [],
        });
        signingResult$.next({ type: 'success' });

        expect(emissions).toContainEqual(
          actions.cardanoDappConnector.setSignTxCompleted(true),
        );
      });
    });
  });

  describe('signData$', () => {
    const createSignDataRequest = (
      resolveFunction: (result: CardanoConfirmationResult) => void,
    ): CardanoConfirmationRequest => ({
      resolve: resolveFunction,
      type: 'signData',
      collateralRefusal: null,
      requestingDapp: mockDapp,
      signDataAddress: 'addr_test1qz...',
      signDataPayload: 'cafebabe',
    });

    it('opens popup view and stores signData request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12345);
      testScheduler.run(({ hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signData$({
          request,
          selectOpenViews$: hotObs('a', { a: [signDataView] as View[] }),
          actions,
          confirmSignData$: hotObs('-'),
          rejectSignData$: hotObs('-'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.views.openView({
              type: 'popupWindow',
              location: CARDANO_DAPP_SIGN_DATA_LOCATION,
            }),
            actions.cardanoDappConnector.setPendingSignDataRequest({
              requestId: requestIdFor('signData'),
              dappOrigin: mockDapp.origin,
              dapp: mockDappInfo,
              address: 'addr_test1qz...',
              payload: 'cafebabe',
            }),
          ]),
        );
      });
    });

    it('dispatches setSignDataCompleted on successful signing in popup mode', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12345);
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signData$({
          request,
          selectOpenViews$: cold('-a', { a: [signDataView] }),
          actions,
          confirmSignData$: cold('--a', { a: unattributedAnswer }),
          rejectSignData$: cold('----'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));

        // Confirm triggers, then signing succeeds
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataCompleted(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
      });
    });

    it('lets the signing result stand when the user rejects after confirming in popup mode', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);
        const signingResult$ = new Subject<{
          type: 'cancelled' | 'error' | 'success';
        }>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signData$({
          request,
          selectOpenViews$: cold('-a', { a: [signDataView] }),
          actions,
          confirmSignData$: cold('--a', { a: unattributedAnswer }),
          // Cancel stays enabled while the signer runs.
          rejectSignData$: cold('---a', { a: unattributedAnswer }),
          viewDisconnected$,
          signingResult$,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(resolveFunction).not.toHaveBeenCalledWith({
          outcome: 'rejected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataCompleted(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('fails the request and frees the queue when the popup view never registers', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signData$({
          request,
          // The popup is asked for but never registers, so confirm and reject
          // can never arrive — they come from the view that never opened.
          selectOpenViews$: cold('a', { a: [] }),
          actions,
          confirmSignData$: NEVER,
          rejectSignData$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'unavailable',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataError(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('flips to error and resolves disconnected when the dApp drops while the prompt is open', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signData$({
          request: {
            ...request,
            // Non-replaying, like the real relay Subject: the drop lands at
            // frame 2, after the view registered at frame 0.
            disconnected$: hotObs('--a', { a: undefined }),
          },
          selectOpenViews$: cold('a', { a: [signDataView] }),
          actions,
          confirmSignData$: NEVER,
          rejectSignData$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'disconnected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataError(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('lets the signing result stand when the dApp drops after confirm in popup mode', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);

        const emissions: unknown[] = [];
        signData$({
          request: {
            ...request,
            disconnected$: hotObs('--a', { a: undefined }),
          },
          selectOpenViews$: cold('a', { a: [signDataView] }),
          actions,
          confirmSignData$: cold('-a', { a: unattributedAnswer }),
          rejectSignData$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: cold('---a', { a: { type: 'success' as const } }),
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataCompleted(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
        expect(emissions).not.toContainEqual(
          actions.cardanoDappConnector.setSignDataError(true),
        );
      });
    });

    it('catches a port disconnect that fires before the popup view registers', () => {
      testScheduler.run(({ cold, hot: hotObs }) => {
        const resolveFunction = vi.fn();
        const request = createSignDataRequest(resolveFunction);
        const signDataView = createView(CARDANO_DAPP_SIGN_DATA_LOCATION);

        const emissions: unknown[] = [];
        signData$({
          request: {
            ...request,
            // Non-replaying, like the real relay Subject: a cold marble would
            // replay on the late subscription and mask the gap under test.
            disconnected$: hotObs('--a', { a: undefined }),
          },
          // No side panel → popup branch; the sign view registers at frame 4,
          // after the disconnect fires at frame 2.
          selectOpenViews$: cold('a---b', { a: [], b: [signDataView] }),
          actions,
          confirmSignData$: NEVER,
          rejectSignData$: NEVER,
          viewDisconnected$: NEVER,
          signingResult$: NEVER,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(resolveFunction).toHaveBeenCalledWith({
          outcome: 'disconnected',
        });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataError(true),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          ]),
        );
      });
    });

    describe('sheet mode', () => {
      it('dispatches setSignDataCompleted on confirm → success', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('--a', { a: unattributedAnswer }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'success' });

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataCompleted(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('dispatches clearPendingSignDataRequest on confirm → cancelled', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('--a', { a: unattributedAnswer }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'cancelled' });

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('dispatches setSignDataError on confirm → error', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<{
            type: 'cancelled' | 'error' | 'success';
          }>();

          const emissions: unknown[] = [];
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('--a', { a: unattributedAnswer }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'error' });

          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataError(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('dispatches clearPendingSignDataRequest on reject', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          let hasCompleted = false;
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: NEVER,
            rejectSignData$: cold('--a', { a: unattributedAnswer }),
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe({
            next: emission => emissions.push(emission),
            complete: () => {
              hasCompleted = true;
            },
          });
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
          // Completion is what lets the serialized queue reach the next request.
          expect(hasCompleted).toBe(true);
        });
      });

      it('rejects and cleans up on panel closure via viewDisconnected$', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: NEVER,
            rejectSignData$: NEVER,
            viewDisconnected$: cold('--a', {
              a: { payload: sidePanel.id },
            }),
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('flips to error and resolves disconnected on port disconnect', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signData$({
            request: {
              ...request,
              windowId: 1,
              disconnected$: cold('--a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: NEVER,
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'disconnected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataError(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('confirm before a later disconnect wins the race', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signData$({
            request: {
              ...request,
              windowId: 1,
              disconnected$: cold('----a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('-a', { a: unattributedAnswer }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: cold('--a', { a: { type: 'success' as const } }),
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(resolveFunction).not.toHaveBeenCalledWith({
            outcome: 'disconnected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataCompleted(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });

      it('lets the signing result stand when the user rejects after confirming', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          let hasCompleted = false;
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('-a', { a: unattributedAnswer }),
            // Cancel stays enabled while the signer runs.
            rejectSignData$: cold('--a', { a: unattributedAnswer }),
            viewDisconnected$: NEVER,
            signingResult$: cold('---a', { a: { type: 'success' as const } }),
          }).subscribe({
            next: emission => emissions.push(emission),
            complete: () => {
              hasCompleted = true;
            },
          });
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(resolveFunction).not.toHaveBeenCalledWith({
            outcome: 'rejected',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataCompleted(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
          // Completion is what lets the serialized queue reach the next request.
          expect(hasCompleted).toBe(true);
        });
      });

      it('lets the signing result stand when a disconnect lands after the user confirmed', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = createSignDataRequest(resolveFunction);
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signData$({
            request: {
              ...request,
              windowId: 1,
              // The page dies at frame 2, while the signer is still working.
              disconnected$: cold('--a', { a: undefined }),
            },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: cold('-a', { a: unattributedAnswer }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$: cold('---a', { a: { type: 'success' as const } }),
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          // The user authorised this signature and it succeeded, so that is
          // what they are shown. Tearing the flow down on the drop instead
          // would both mislabel a success as a failure and orphan the signing
          // result — which the next queued request would then consume as its
          // own, reporting a completed sign it never performed.
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.setSignDataCompleted(true),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
          expect(emissions).not.toContainEqual(
            actions.cardanoDappConnector.setSignDataError(true),
          );
        });
      });
    });
  });
});
