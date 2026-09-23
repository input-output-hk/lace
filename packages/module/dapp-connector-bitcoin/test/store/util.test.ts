import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { AccountId } from '@lace-contract/wallet-repo';
import { BehaviorSubject, concatMap, delay, NEVER, of, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
  BITCOIN_DAPP_SIGN_MESSAGE_SHEET_ROUTE,
  BITCOIN_DAPP_SIGN_TX_LOCATION,
  BITCOIN_DAPP_SIGN_TX_SHEET_ROUTE,
} from '../../src/const';
import { closeRequestedPopup } from '../../src/store/side-effects';
import { bitcoinDappConnectorActions } from '../../src/store/slice';
import {
  detectViewClosure,
  findTargetSidePanel,
  signMessage$,
  signPsbt$,
} from '../../src/store/util';

import type { ActionCreators } from '../../src';
import type { BitcoinConfirmationRequest } from '../../src/store/dependencies/create-confirmation-callback';
import type { BitcoinSigningResult } from '../../src/store/util';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { View } from '@lace-contract/views';

(globalThis as { chrome?: unknown }).chrome = {
  sidePanel: { setPanelBehavior: () => {} },
};

const mockDapp: Dapp = {
  id: DappId('https://test-dapp.com'),
  name: 'Test DApp',
  origin: 'https://test-dapp.com',
  imageUrl: 'https://test-dapp.com/favicon.ico',
};

const mockDappInfo = {
  name: mockDapp.name,
  origin: mockDapp.origin,
  imageUrl: mockDapp.imageUrl,
};

const actions = {
  ...bitcoinDappConnectorActions,
  ...viewsActions,
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

const createSignMessageRequest = (
  resolve: (result: { outcome: string }) => void,
): BitcoinConfirmationRequest => ({
  resolve,
  type: 'signMessage',
  requestingDapp: mockDapp,
  address: 'bc1qaddress',
  message: 'hello',
  signatureType: 'ecdsa',
});

const SIGNING_ACCOUNT_ID = AccountId('bitcoin-account-0');

const createSignPsbtRequest = (
  resolve: (result: { outcome: string }) => void,
  psbtsBase64 = ['cHNidP8BAAoAAAAAAAAAAAAA'],
): BitcoinConfirmationRequest => ({
  resolve,
  type: 'signPsbt',
  requestingDapp: mockDapp,
  psbtsBase64,
  accountId: SIGNING_ACCOUNT_ID,
  options: { toSignInputs: [{ index: 0 }] },
});

describe('findTargetSidePanel', () => {
  beforeEach(() => {
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { setPanelBehavior: () => {} },
    };
  });

  it('returns undefined when chrome.sidePanel API is unavailable', () => {
    (globalThis as { chrome?: unknown }).chrome = {};
    expect(findTargetSidePanel([createSidePanelView(1)], 1)).toBeUndefined();
  });

  it('returns undefined when the only open side panel is in a different window', () => {
    expect(findTargetSidePanel([createSidePanelView(2)], 1)).toBeUndefined();
  });

  it('returns the side panel matching the requested windowId', () => {
    const sidePanel = createSidePanelView(1);
    expect(findTargetSidePanel([sidePanel, createView('/x')], 1)).toBe(
      sidePanel,
    );
  });

  it('returns the first side panel when no windowId is provided', () => {
    const sidePanel = createSidePanelView(7);
    expect(findTargetSidePanel([sidePanel])).toBe(sidePanel);
  });
});

describe('bitcoin-dapp-connector-util', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    (globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { setPanelBehavior: () => {} },
    };
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('detectViewClosure', () => {
    it('emits once when the view disappears from the open views', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const view = createView('/somewhere');
        const selectOpenViews$ = cold('a-b', { a: [view], b: [] as View[] });
        expectObservable(
          detectViewClosure({ dappConnectorView: view, selectOpenViews$ }),
        ).toBe('--(a|)', { a: false });
      });
    });
  });

  describe('signMessage$', () => {
    it('opens the popup view and stores the pending signMessage request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12_345);
      testScheduler.run(({ hot }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: hot('a', { a: [view] }),
          actions,
          confirmSignMessage$: hot('-'),
          rejectSignMessage$: hot('-'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.views.openView({
              type: 'popupWindow',
              location: BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
            }),
            actions.bitcoinDappConnector.setPendingSignMessageRequest({
              requestId: requestIdFor('signMessage'),
              dappOrigin: mockDapp.origin,
              dapp: mockDappInfo,
              address: 'bc1qaddress',
              message: 'hello',
              signatureType: 'ecdsa',
            }),
          ]),
        );
      });
    });

    it('defaults absent request fields when storing the pending request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12_345);
      testScheduler.run(({ hot }) => {
        const request: BitcoinConfirmationRequest = {
          resolve: vi.fn(),
          type: 'signMessage',
          requestingDapp: { ...mockDapp, imageUrl: '' },
        };
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: hot('a', { a: [view] }),
          actions,
          confirmSignMessage$: hot('-'),
          rejectSignMessage$: hot('-'),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setPendingSignMessageRequest({
              requestId: requestIdFor('signMessage'),
              dappOrigin: mockDapp.origin,
              dapp: { ...mockDappInfo, imageUrl: undefined },
              address: '',
              message: '',
              signatureType: 'ecdsa',
            }),
          ]),
        );
      });
    });

    it('reports the prompt as unavailable, never a rejection, when the popup view never registers', () => {
      testScheduler.run(({ cold, hot }) => {
        const resolve = vi.fn();
        const request = createSignMessageRequest(resolve);

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signMessage$({
          request,
          // The popup is asked for but never registers, so confirm and reject
          // can never arrive — they come from the view that never opened.
          selectOpenViews$: cold('a', { a: [] }),
          actions,
          confirmSignMessage$: hot('-'),
          rejectSignMessage$: hot('-'),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        // 'rejected' would tell the dApp the user declined a prompt nobody saw,
        // and dApps branch on a refusal to stop retrying.
        expect(resolve).toHaveBeenCalledWith({ outcome: 'unavailable' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignMessageError(true),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
        // Completion is what lets the serialized queue reach the next request.
        expect(hasCompleted).toBe(true);
      });
    });

    it('resolves with a rejection when the user rejects', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignMessage$: cold('---'),
          rejectSignMessage$: cold('--a', { a: undefined }),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        flush();

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
      });
    });

    it('resolves with a rejection when the popup is closed', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a-b', { a: [view], b: [] as View[] }),
          actions,
          confirmSignMessage$: cold('----'),
          rejectSignMessage$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        flush();

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
      });
    });

    it('dispatches setSignMessageCompleted without closing the popup on confirm then success', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignMessage$: cold('--a', { a: undefined }),
          rejectSignMessage$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignMessageCompleted(true),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
        expect(emissions).not.toEqual(
          expect.arrayContaining([actions.views.closeView(view.id)]),
        );
      });
    });

    it('asks for the popup to close and clears the request on confirm then cancelled', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignMessage$: cold('--a', { a: undefined }),
          rejectSignMessage$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'cancelled' });

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.closePopupRequested({
              location: BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
              requestId: requestIdFor('signMessage'),
            }),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
      });
    });

    it('dispatches setSignMessageError without closing the popup on confirm then signer error', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignMessage$: cold('--a', { a: undefined }),
          rejectSignMessage$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'error' });

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignMessageError(true),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
        expect(emissions).not.toEqual(
          expect.arrayContaining([actions.views.closeView(view.id)]),
        );
      });
    });

    it('lets the signing result stand when the popup closes after the user confirmed', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          // The popup goes away one frame after the confirm, while the signer
          // is still working.
          selectOpenViews$: cold('-a-b', { a: [view], b: [] as View[] }),
          actions,
          confirmSignMessage$: cold('--a', { a: undefined }),
          rejectSignMessage$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        // Tearing the flow down on the closure would orphan the signing result
        // — the next queued request would then consume it as its own and report
        // a completed sign it never performed.
        expect(resolveFunction).toHaveBeenCalledTimes(1);
        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignMessageCompleted(true),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
      });
    });

    it('lets the signing result stand when the user rejects after confirming', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignMessageRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signMessage$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignMessage$: cold('--a', { a: undefined }),
          // Cancel stays enabled while the signer runs.
          rejectSignMessage$: cold('---a', { a: undefined }),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledTimes(1);
        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignMessageCompleted(true),
            actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
          ]),
        );
      });
    });

    describe('sheet mode', () => {
      it('opens the sheet targeting the sender window side panel', () => {
        vi.spyOn(Date, 'now').mockReturnValue(12_345);
        testScheduler.run(({ hot }) => {
          const resolveFunction = vi.fn();
          const request = {
            ...createSignMessageRequest(resolveFunction),
            windowId: 1,
          };
          const sidePanel = createSidePanelView(1);

          const emissions: unknown[] = [];
          signMessage$({
            request,
            selectOpenViews$: hot('a', { a: [sidePanel] }),
            actions,
            confirmSignMessage$: hot('-'),
            rejectSignMessage$: hot('-'),
            viewDisconnected$: new Subject(),
            signingResult$: new Subject<BitcoinSigningResult>(),
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage({
                route: BITCOIN_DAPP_SIGN_MESSAGE_SHEET_ROUTE,
                params: {
                  requestId: requestIdFor('signMessage'),
                  dapp: {
                    icon: { type: 'uri', uri: mockDapp.imageUrl },
                    name: mockDapp.name,
                    origin: mockDapp.origin,
                  },
                  address: 'bc1qaddress',
                  message: 'hello',
                  signatureType: 'ecdsa',
                },
                targetViewId: sidePanel.id,
              }),
            ]),
          );
        });
      });

      it('closes the sheet and clears the request on confirm then cancelled', () => {
        testScheduler.run(({ cold }) => {
          const resolveFunction = vi.fn();
          const request = {
            ...createSignMessageRequest(resolveFunction),
            windowId: 1,
          };
          const sidePanel = createSidePanelView(1);
          const signingResult$ = new Subject<BitcoinSigningResult>();

          const emissions: unknown[] = [];
          signMessage$({
            request,
            selectOpenViews$: cold('-a', { a: [sidePanel] }),
            actions,
            confirmSignMessage$: cold('--a', { a: undefined }),
            rejectSignMessage$: cold('----'),
            viewDisconnected$: new Subject(),
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
              actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
            ]),
          );
        });
      });

      it('rejects and cleans up when the side panel disconnects', () => {
        testScheduler.run(({ cold, flush }) => {
          const resolveFunction = vi.fn();
          const request = {
            ...createSignMessageRequest(resolveFunction),
            windowId: 1,
          };
          const sidePanel = createSidePanelView(1);
          const viewDisconnected$ = new Subject<{ payload: ViewId }>();

          const emissions: unknown[] = [];
          signMessage$({
            request,
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignMessage$: cold('---'),
            rejectSignMessage$: cold('---'),
            viewDisconnected$,
            signingResult$: new Subject<BitcoinSigningResult>(),
          }).subscribe(emission => emissions.push(emission));
          flush();
          viewDisconnected$.next({ payload: sidePanel.id });

          expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
            ]),
          );
        });
      });

      it('lets the signing result stand when the side panel disconnects after the user confirmed', () => {
        testScheduler.run(({ cold, flush }) => {
          const resolveFunction = vi.fn();
          const request = {
            ...createSignMessageRequest(resolveFunction),
            windowId: 1,
          };
          const sidePanel = createSidePanelView(1);
          const viewDisconnected$ = new Subject<{ payload: ViewId }>();
          const signingResult$ = new Subject<BitcoinSigningResult>();

          const emissions: unknown[] = [];
          signMessage$({
            request,
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignMessage$: cold('-a', { a: undefined }),
            rejectSignMessage$: cold('---'),
            viewDisconnected$,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));
          flush();
          viewDisconnected$.next({ payload: sidePanel.id });
          signingResult$.next({ type: 'success' });

          expect(resolveFunction).toHaveBeenCalledTimes(1);
          expect(resolveFunction).toHaveBeenCalledWith({
            outcome: 'confirmed',
          });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.bitcoinDappConnector.setSignMessageCompleted(true),
              actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
            ]),
          );
          expect(emissions).not.toContainEqual(
            actions.views.setActiveSheetPage(null),
          );
        });
      });
    });
  });

  describe('queue handover', () => {
    it('does not answer a queued request when its predecessor closes their shared window', async () => {
      const resolveA = vi.fn();
      const resolveB = vi.fn();
      const signMessageView = createView(BITCOIN_DAPP_SIGN_MESSAGE_LOCATION);
      const rejectSignMessage$ = new Subject<undefined>();
      const viewDisconnected$ = new Subject<{ payload: ViewId }>();
      const request$ = new Subject<BitcoinConfirmationRequest>();
      const closePopupRequested$ = new Subject<{
        payload: { location: string; requestId?: string };
      }>();

      const openViews$ = new BehaviorSubject<View[]>([signMessageView]);
      const pendingSignMessageRequest$ = new BehaviorSubject<{
        requestId: string;
      } | null>(null);
      const pendingRequestIds: string[] = [];
      const dispatched: string[] = [];

      const apply = (action: unknown) => {
        const { type, payload } = action as { type: string; payload?: unknown };
        dispatched.push(type);
        if (type === 'bitcoinDappConnector/setPendingSignMessageRequest') {
          const request = payload as { requestId: string };
          pendingRequestIds.push(request.requestId);
          pendingSignMessageRequest$.next(request);
        }
        if (type === 'bitcoinDappConnector/clearPendingSignMessageRequest') {
          pendingSignMessageRequest$.next(null);
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
        { bitcoinDappConnector: { closePopupRequested$ } } as never,
        {
          views: { selectOpenViews$: openViews$ },
          bitcoinDappConnector: {
            selectPendingSignMessageRequest$: pendingSignMessageRequest$,
            selectPendingSignPsbtRequest$: of(null),
          },
        } as never,
        { actions } as never,
      )
        .pipe(delay(0))
        .subscribe(apply);

      request$
        .pipe(
          concatMap(request =>
            signMessage$({
              request,
              selectOpenViews$: openViews$,
              actions,
              confirmSignMessage$: NEVER,
              rejectSignMessage$,
              viewDisconnected$,
              signingResult$: NEVER,
            }),
          ),
          delay(0),
        )
        .subscribe(apply);

      request$.next(createSignMessageRequest(resolveA));
      await nextTask();
      request$.next({
        ...createSignMessageRequest(resolveB),
        message: 'second',
      });
      await nextTask();

      rejectSignMessage$.next(undefined);
      closePopupRequested$.next({
        payload: {
          location: BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
          requestId: pendingRequestIds[0],
        },
      });
      await nextTask();
      await nextTask();
      await nextTask();

      expect(resolveA).toHaveBeenCalledWith({ outcome: 'rejected' });
      expect(pendingRequestIds).toHaveLength(2);
      expect(dispatched).not.toContain('views/closeView');
      expect(openViews$.value).toEqual([signMessageView]);
      expect(resolveB).not.toHaveBeenCalled();
    });
  });

  describe('signPsbt$', () => {
    it('opens the popup view and stores the pending signPsbt request', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12_345);
      testScheduler.run(({ hot }) => {
        const resolveFunction = vi.fn();
        const request = createSignPsbtRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: hot('a', { a: [view] }),
          actions,
          confirmSignPsbt$: hot('-'),
          rejectSignPsbt$: hot('-'),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.views.openView({
              type: 'popupWindow',
              location: BITCOIN_DAPP_SIGN_TX_LOCATION,
            }),
            actions.bitcoinDappConnector.setPendingSignPsbtRequest({
              requestId: requestIdFor('signPsbt'),
              dappOrigin: mockDapp.origin,
              dapp: mockDappInfo,
              psbtsBase64: ['cHNidP8BAAoAAAAAAAAAAAAA'],
              currentIndex: 0,
              accountId: SIGNING_ACCOUNT_ID,
              options: { toSignInputs: [{ index: 0 }] },
            }),
          ]),
        );
      });
    });

    it('resolves with a rejection when the user rejects', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = createSignPsbtRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignPsbt$: cold('---'),
          rejectSignPsbt$: cold('--a', { a: undefined }),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        flush();

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
          ]),
        );
      });
    });

    it('resolves with a rejection when the popup view disconnects', () => {
      testScheduler.run(({ cold, flush }) => {
        const resolveFunction = vi.fn();
        const request = createSignPsbtRequest(resolveFunction);
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);
        const viewDisconnected$ = new Subject<{ payload: ViewId }>();

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: cold('a', { a: [view] }),
          actions,
          confirmSignPsbt$: cold('---'),
          rejectSignPsbt$: cold('---'),
          viewDisconnected$,
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        flush();
        viewDisconnected$.next({ payload: view.id });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'rejected' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
          ]),
        );
      });
    });

    it('completes a batch only after every PSBT signed successfully', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignPsbtRequest(resolveFunction, [
          'cHNidP8BAAoAAAAAAAAAAAAA',
          'cHNidP8BAAoAAAAAAAAAAAAA',
          'cHNidP8BAAoAAAAAAAAAAAAA',
        ]);
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignPsbt$: cold('--a', { a: undefined }),
          rejectSignPsbt$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        signingResult$.next({ type: 'success' });
        signingResult$.next({ type: 'success' });
        expect(emissions).not.toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtCompleted(true),
          ]),
        );

        signingResult$.next({ type: 'success' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtCompleted(true),
            actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
          ]),
        );
      });
    });

    it('fails a batch as soon as one PSBT errors', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = createSignPsbtRequest(resolveFunction, [
          'cHNidP8BAAoAAAAAAAAAAAAA',
          'cHNidP8BAAoAAAAAAAAAAAAA',
        ]);
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        let hasCompleted = false;
        signPsbt$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignPsbt$: cold('--a', { a: undefined }),
          rejectSignPsbt$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe({
          next: emission => emissions.push(emission),
          complete: () => {
            hasCompleted = true;
          },
        });
        testScheduler.flush();

        signingResult$.next({ type: 'success' });
        signingResult$.next({ type: 'error' });

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtError(true),
            actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
          ]),
        );
        expect(emissions).not.toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtCompleted(true),
          ]),
        );
        expect(emissions).not.toEqual(
          expect.arrayContaining([actions.views.closeView(view.id)]),
        );
        // Completion is what lets the serialized queue reach the next
        // request: a reported failure that never terminates the flow would
        // wedge every later Bitcoin request behind it.
        expect(hasCompleted).toBe(true);
        // Order matters: a per-dispatch state sync that saw the request
        // cleared before the error flag would auto-close the popup on the very
        // failure it is meant to show.
        const typeOf = (emission: unknown) =>
          (emission as { type?: string }).type;
        const errorIndex = emissions.findIndex(
          emission =>
            typeOf(emission) ===
            typeOf(actions.bitcoinDappConnector.setSignPsbtError(true)),
        );
        const clearIndex = emissions.findIndex(
          emission =>
            typeOf(emission) ===
            typeOf(actions.bitcoinDappConnector.clearPendingSignPsbtRequest()),
        );
        expect(errorIndex).toBeGreaterThanOrEqual(0);
        expect(errorIndex).toBeLessThan(clearIndex);
      });
    });

    it('sheet mode: dispatches setSignPsbtCompleted without closing the sheet on confirm then success', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request = {
          ...createSignPsbtRequest(resolveFunction),
          windowId: 1,
        };
        const sidePanel = createSidePanelView(1);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: cold('-a', { a: [sidePanel] }),
          actions,
          confirmSignPsbt$: cold('--a', { a: undefined }),
          rejectSignPsbt$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ outcome: 'confirmed' });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtCompleted(true),
            actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
          ]),
        );
        expect(emissions).not.toEqual(
          expect.arrayContaining([actions.views.setActiveSheetPage(null)]),
        );
      });
    });

    it('treats an absent PSBT batch as a single expected signing result', () => {
      testScheduler.run(({ cold }) => {
        const resolveFunction = vi.fn();
        const request: BitcoinConfirmationRequest = {
          resolve: resolveFunction,
          type: 'signPsbt',
          requestingDapp: {
            ...mockDapp,
            imageUrl: undefined,
          } as unknown as Dapp,
        };
        const view = createView(BITCOIN_DAPP_SIGN_TX_LOCATION);
        const signingResult$ = new Subject<BitcoinSigningResult>();

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: cold('-a', { a: [view] }),
          actions,
          confirmSignPsbt$: cold('--a', { a: undefined }),
          rejectSignPsbt$: cold('----'),
          viewDisconnected$: new Subject(),
          signingResult$,
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.bitcoinDappConnector.setSignPsbtCompleted(true),
          ]),
        );
      });
    });

    it('sheet mode: opens the sheet with the PSBT batch params', () => {
      vi.spyOn(Date, 'now').mockReturnValue(12_345);
      testScheduler.run(({ hot }) => {
        const resolveFunction = vi.fn();
        const request = {
          ...createSignPsbtRequest(resolveFunction),
          windowId: 1,
        };
        const sidePanel = createSidePanelView(1);

        const emissions: unknown[] = [];
        signPsbt$({
          request,
          selectOpenViews$: hot('a', { a: [sidePanel] }),
          actions,
          confirmSignPsbt$: hot('-'),
          rejectSignPsbt$: hot('-'),
          viewDisconnected$: new Subject(),
          signingResult$: new Subject<BitcoinSigningResult>(),
        }).subscribe(emission => emissions.push(emission));
        testScheduler.flush();

        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.views.setActiveSheetPage({
              route: BITCOIN_DAPP_SIGN_TX_SHEET_ROUTE,
              params: {
                requestId: requestIdFor('signPsbt'),
                dapp: {
                  icon: { type: 'uri', uri: mockDapp.imageUrl },
                  name: mockDapp.name,
                  origin: mockDapp.origin,
                },
                psbtsBase64: ['cHNidP8BAAoAAAAAAAAAAAAA'],
                options: { toSignInputs: [{ index: 0 }] },
              },
              targetViewId: sidePanel.id,
            }),
          ]),
        );
      });
    });
  });
});
