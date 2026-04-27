import { authenticationPromptActions } from '@lace-contract/authentication-prompt';
import { DappId } from '@lace-contract/dapp-connector';
import { ViewId } from '@lace-contract/module';
import { viewsActions } from '@lace-contract/views';
import { NEVER, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../src/browser/const';
import { signData$, signTx$ } from '../src/browser/store/util';
import { cardanoDappConnectorActions } from '../src/common/store/slice';

import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type { ActionCreators } from '../src/index';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { View } from '@lace-contract/views';
import type { ColdObservable } from 'rxjs/internal/testing/ColdObservable';
import type { Mock } from 'vitest';

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

const actions = {
  ...cardanoDappConnectorActions,
  ...viewsActions,
  ...authenticationPromptActions,
} as unknown as ActionCreators;

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
    confirm$: ColdObservable<undefined>;
    reject$: ColdObservable<undefined>;
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

describe('cardano-dapp-connector-util', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  // Parameterized tests for rejection and popup closure (shared behavior)
  describe.each(flowConfigs)('$name rejection and closure', config => {
    it('resolves with isConfirmed: false when user rejects', () => {
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
          reject$: cold('--a', { a: undefined }),
          ...(config.requiresAuth && { signingResult$, viewDisconnected$ }),
        });
        flush();

        expect(resolveFunction).toHaveBeenCalledWith(
          expect.objectContaining({ isConfirmed: false }),
        );
      });
    });

    it('resolves with isConfirmed: false when popup is closed', () => {
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
          expect.objectContaining({ isConfirmed: false }),
        );
      });
    });
  });

  // Flow-specific tests
  describe('signTx$', () => {
    const createSignTxRequest = (
      resolveFunction: (result: { isConfirmed: boolean }) => void,
    ): CardanoConfirmationRequest => ({
      resolve: resolveFunction,
      type: 'signTx',
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
              requestId: `${mockDapp.origin}-signTx-12345`,
              dappOrigin: mockDapp.origin,
              dapp: mockDappInfo,
              txHex: 'deadbeef1234',
              partialSign: false,
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
          confirmSignTx$: cold('--a', { a: undefined }),
          rejectSignTx$: cold('----'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));

        // Confirm triggers, then signing succeeds
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignTxCompleted(true),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          ]),
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
            confirmSignTx$: cold('--a', { a: undefined }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'success' });

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
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
            confirmSignTx$: cold('--a', { a: undefined }),
            rejectSignTx$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'cancelled' });

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
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
            confirmSignTx$: cold('--a', { a: undefined }),
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
          signTx$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignTx$: NEVER,
            rejectSignTx$: cold('--a', { a: undefined }),
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: false });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
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

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: false });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            ]),
          );
        });
      });
    });
  });

  describe('signData$', () => {
    const createSignDataRequest = (
      resolveFunction: (result: { isConfirmed: boolean }) => void,
    ): CardanoConfirmationRequest => ({
      resolve: resolveFunction,
      type: 'signData',
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
              requestId: `${mockDapp.origin}-signData-12345`,
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
          confirmSignData$: cold('--a', { a: undefined }),
          rejectSignData$: cold('----'),
          viewDisconnected$,
          signingResult$,
        }).subscribe(emission => emissions.push(emission));

        // Confirm triggers, then signing succeeds
        testScheduler.flush();
        signingResult$.next({ type: 'success' });

        expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
        expect(emissions).toEqual(
          expect.arrayContaining([
            actions.cardanoDappConnector.setSignDataCompleted(true),
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
            confirmSignData$: cold('--a', { a: undefined }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'success' });

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
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
            confirmSignData$: cold('--a', { a: undefined }),
            rejectSignData$: NEVER,
            viewDisconnected$: NEVER,
            signingResult$,
          }).subscribe(emission => emissions.push(emission));

          testScheduler.flush();
          signingResult$.next({ type: 'cancelled' });

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: true });
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
            confirmSignData$: cold('--a', { a: undefined }),
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
          signData$({
            request: { ...request, windowId: 1 },
            selectOpenViews$: cold('a', { a: [sidePanel] }),
            actions,
            confirmSignData$: NEVER,
            rejectSignData$: cold('--a', { a: undefined }),
            viewDisconnected$: NEVER,
            signingResult$: NEVER,
          }).subscribe(emission => emissions.push(emission));
          testScheduler.flush();

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: false });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
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

          expect(resolveFunction).toHaveBeenCalledWith({ isConfirmed: false });
          expect(emissions).toEqual(
            expect.arrayContaining([
              actions.views.setActiveSheetPage(null),
              actions.cardanoDappConnector.clearPendingSignDataRequest(),
            ]),
          );
        });
      });
    });
  });
});
