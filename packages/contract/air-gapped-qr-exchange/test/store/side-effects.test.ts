import '../../src/augmentations';

import { viewsActions } from '@lace-contract/views';
import { HexBytes } from '@lace-lib/util';
import { testSideEffect } from '@lace-lib/util-dev';
import { BehaviorSubject, Subject, map } from 'rxjs';
import { describe, expect, it } from 'vitest';

import {
  airGappedQrExchangeRequests$,
  triggerAirGappedQrExchange,
} from '../../src/store/request';
import { makeAirGappedQrExchangeSideEffect } from '../../src/store/side-effects';
import { airGappedQrExchangeActions } from '../../src/store/slice';
import { AirGappedQrExchangeCancelledError } from '../../src/types';

import type { AirGappedQrExchangeRequest } from '../../src/store/request';
import type { AirGappedQrExchangeResult } from '../../src/types';
import type { ViewId } from '@lace-contract/module';
import type { View } from '@lace-contract/views';

const REQUEST_TYPE = 'cardano-sign-request';
const RESPONSE_TYPE = 'cardano-sign-response';
const RESPONSE_CBOR = new Uint8Array([0xb2, 0x05, 0x06, 0x07]);
const SCANNER_LOCATION = '/seed-signer-scan';

const actions = { ...airGappedQrExchangeActions, ...viewsActions };

interface ResultSpy {
  values: AirGappedQrExchangeResult[];
  error: unknown;
  completed: boolean;
}

const newRequest = (
  requestId: string,
  expectedResponseType: string | readonly string[] = RESPONSE_TYPE,
): { request: AirGappedQrExchangeRequest; spy: ResultSpy } => {
  const result$ = new Subject<AirGappedQrExchangeResult>();
  const spy: ResultSpy = { values: [], error: undefined, completed: false };
  result$.subscribe({
    next: value => spy.values.push(value),
    error: error => {
      spy.error = error;
    },
    complete: () => {
      spy.completed = true;
    },
  });
  return {
    request: {
      requestId,
      options: {
        request: { urType: REQUEST_TYPE, cbor: new Uint8Array([0xa1, 0x01]) },
        expectedResponseType,
      },
      result$,
    },
    spy,
  };
};

interface Harness {
  emitted: unknown[];
  scanCompleted$: Subject<
    ReturnType<typeof actions.airGappedQrExchange.scanCompleted>
  >;
  cancelled$: Subject<ReturnType<typeof actions.airGappedQrExchange.cancelled>>;
  failed$: Subject<ReturnType<typeof actions.airGappedQrExchange.failed>>;
  viewDisconnected$: Subject<{ payload: ViewId }>;
  selectOpenViews$: Subject<{ id: ViewId; location: string }[]>;
  subscribe: () => { unsubscribe: () => void };
}

const makeHarness = (
  opensScannerTab: boolean,
  initialOpenViews?: { id: ViewId; location: string }[],
): Harness => {
  const emitted: unknown[] = [];
  const scanCompleted$ = new Subject<
    ReturnType<typeof actions.airGappedQrExchange.scanCompleted>
  >();
  const cancelled$ = new Subject<
    ReturnType<typeof actions.airGappedQrExchange.cancelled>
  >();
  const failed$ = new Subject<
    ReturnType<typeof actions.airGappedQrExchange.failed>
  >();
  const viewDisconnected$ = new Subject<{ payload: ViewId }>();
  const selectOpenViews$ = initialOpenViews
    ? new BehaviorSubject<{ id: ViewId; location: string }[]>(initialOpenViews)
    : new Subject<{ id: ViewId; location: string }[]>();

  const sideEffect = makeAirGappedQrExchangeSideEffect({
    opensScannerTab,
    scannerLocation: SCANNER_LOCATION,
  });

  return {
    emitted,
    scanCompleted$,
    cancelled$,
    failed$,
    viewDisconnected$,
    selectOpenViews$,
    subscribe: () =>
      sideEffect(
        {
          airGappedQrExchange: { scanCompleted$, cancelled$, failed$ },
          views: { viewDisconnected$ },
        } as never,
        { views: { selectOpenViews$ } } as never,
        { actions } as never,
      ).subscribe(action => emitted.push(action)),
  };
};

describe('makeAirGappedQrExchangeSideEffect', () => {
  it('dispatches requested with frames and opens the scanner tab on the extension', () => {
    const h = makeHarness(true);
    const sub = h.subscribe();
    const { request } = newRequest('req-1');

    airGappedQrExchangeRequests$.next(request);

    const requested = h.emitted[0] as ReturnType<
      typeof actions.airGappedQrExchange.requested
    >;
    expect(requested.type).toBe(actions.airGappedQrExchange.requested.type);
    expect(requested.payload.requestId).toBe('req-1');
    expect(requested.payload.frames.length).toBeGreaterThan(0);
    expect(requested.payload.expectedResponseType).toBe(RESPONSE_TYPE);

    expect(h.emitted[1]).toEqual(
      actions.views.openView({ type: 'tab', location: SCANNER_LOCATION }),
    );

    sub.unsubscribe();
  });

  it('threads the detail line into the pending exchange', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request } = newRequest('req-detail');
    request.options = { ...request.options, detail: 'a1b2c3' };

    airGappedQrExchangeRequests$.next(request);

    const requested = h.emitted[0] as ReturnType<
      typeof actions.airGappedQrExchange.requested
    >;
    expect(requested.payload.detail).toBe('a1b2c3');

    sub.unsubscribe();
  });

  it('threads the request-phase instruction key into the pending exchange', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request } = newRequest('req-request-instruction');
    request.options = {
      ...request.options,
      requestInstructionKey:
        'v2.air-gapped-qr-exchange.blind-signing.instruction',
    };

    airGappedQrExchangeRequests$.next(request);

    const requested = h.emitted[0] as ReturnType<
      typeof actions.airGappedQrExchange.requested
    >;
    expect(requested.payload.requestInstructionKey).toBe(
      'v2.air-gapped-qr-exchange.blind-signing.instruction',
    );

    sub.unsubscribe();
  });

  it('does not open a tab on mobile', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request } = newRequest('req-2');

    airGappedQrExchangeRequests$.next(request);

    expect(h.emitted).toHaveLength(1);
    expect((h.emitted[0] as { type: string }).type).toBe(
      actions.airGappedQrExchange.requested.type,
    );

    sub.unsubscribe();
  });

  it('cancels the exchange and unblocks the queue when the trigger subscription is torn down', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();

    const abandonedSub = triggerAirGappedQrExchange({
      request: { urType: REQUEST_TYPE, cbor: new Uint8Array([0xa1, 0x01]) },
      expectedResponseType: RESPONSE_TYPE,
    }).subscribe({ error: () => undefined });
    const abandonedId = (
      h.emitted[0] as ReturnType<typeof actions.airGappedQrExchange.requested>
    ).payload.requestId;

    const queued = newRequest('req-queued');
    airGappedQrExchangeRequests$.next(queued.request);
    expect(h.emitted).toHaveLength(1);

    abandonedSub.unsubscribe();

    expect(h.emitted).toContainEqual(
      actions.airGappedQrExchange.cancelled({ requestId: abandonedId }),
    );
    const queuedRequested = h.emitted.find(
      action =>
        (action as { type: string }).type ===
          actions.airGappedQrExchange.requested.type &&
        (action as ReturnType<typeof actions.airGappedQrExchange.requested>)
          .payload.requestId === 'req-queued',
    );
    expect(queuedRequested).toBeDefined();

    sub.unsubscribe();
  });

  it('does not dispatch a cancel when the trigger settles before teardown', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();

    const settledSub = triggerAirGappedQrExchange({
      request: { urType: REQUEST_TYPE, cbor: new Uint8Array([0xa1, 0x01]) },
      expectedResponseType: RESPONSE_TYPE,
    }).subscribe({ error: () => undefined });
    const requestId = (
      h.emitted[0] as ReturnType<typeof actions.airGappedQrExchange.requested>
    ).payload.requestId;

    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId,
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );
    settledSub.unsubscribe();

    expect(h.emitted).not.toContainEqual(
      actions.airGappedQrExchange.cancelled({ requestId }),
    );

    sub.unsubscribe();
  });

  it('closes the scanner tab when building a request throws on the extension', () => {
    const scannerViewId = 'tab-poison' as unknown as ViewId;
    const h = makeHarness(true, [
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    const sub = h.subscribe();

    const poisoned = newRequest('req-poison-tab');
    Object.defineProperty(poisoned.request.options, 'expectedResponseType', {
      get: () => {
        throw new Error('boom');
      },
    });
    airGappedQrExchangeRequests$.next(poisoned.request);

    expect(h.emitted).toContainEqual(
      actions.airGappedQrExchange.failed({
        requestId: 'req-poison-tab',
        message: 'boom',
      }),
    );
    expect(h.emitted).toContainEqual(actions.views.closeView(scannerViewId));

    sub.unsubscribe();
  });

  it('drops an exchange that was aborted while still queued', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();

    const active = newRequest('req-active');
    airGappedQrExchangeRequests$.next(active.request);

    const queuedSub = triggerAirGappedQrExchange({
      request: { urType: REQUEST_TYPE, cbor: new Uint8Array([0xa1, 0x01]) },
      expectedResponseType: RESPONSE_TYPE,
    }).subscribe({ error: () => undefined });
    queuedSub.unsubscribe();

    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-active',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    const requestedCount = h.emitted.filter(
      action =>
        (action as { type: string }).type ===
        actions.airGappedQrExchange.requested.type,
    ).length;
    expect(requestedCount).toBe(1);

    const next = newRequest('req-after-aborted-queued');
    airGappedQrExchangeRequests$.next(next.request);
    const nextRequested = h.emitted.find(
      action =>
        (action as { type: string }).type ===
          actions.airGappedQrExchange.requested.type &&
        (action as ReturnType<typeof actions.airGappedQrExchange.requested>)
          .payload.requestId === 'req-after-aborted-queued',
    );
    expect(nextRequested).toBeDefined();

    sub.unsubscribe();
  });

  it('closes the scanner tab when an active exchange is aborted on the extension', () => {
    const scannerViewId = 'tab-abort' as unknown as ViewId;
    const h = makeHarness(true, [
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    const sub = h.subscribe();

    const abandonedSub = triggerAirGappedQrExchange({
      request: { urType: REQUEST_TYPE, cbor: new Uint8Array([0xa1, 0x01]) },
      expectedResponseType: RESPONSE_TYPE,
    }).subscribe({ error: () => undefined });
    const requestId = (
      h.emitted[0] as ReturnType<typeof actions.airGappedQrExchange.requested>
    ).payload.requestId;

    abandonedSub.unsubscribe();

    expect(h.emitted).toContainEqual(
      actions.airGappedQrExchange.cancelled({ requestId }),
    );
    expect(h.emitted).toContainEqual(actions.views.closeView(scannerViewId));

    sub.unsubscribe();
  });

  it('closes the scanner tab when an exchange fails on the extension', () => {
    const scannerViewId = 'tab-fail' as unknown as ViewId;
    const h = makeHarness(true, [
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    const sub = h.subscribe();
    const { request } = newRequest('req-fail-close');

    airGappedQrExchangeRequests$.next(request);
    h.failed$.next(
      actions.airGappedQrExchange.failed({
        requestId: 'req-fail-close',
        message: 'scan failed',
      }),
    );

    expect(h.emitted).toContainEqual(actions.views.closeView(scannerViewId));

    sub.unsubscribe();
  });

  it('emits failed and keeps processing the queue when building a request throws', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();

    const poisoned = newRequest('req-poisoned');
    Object.defineProperty(poisoned.request.options, 'expectedResponseType', {
      get: () => {
        throw new Error('boom');
      },
    });
    airGappedQrExchangeRequests$.next(poisoned.request);

    expect(poisoned.spy.error).toBeInstanceOf(Error);
    expect(h.emitted).toContainEqual(
      actions.airGappedQrExchange.failed({
        requestId: 'req-poisoned',
        message: 'boom',
      }),
    );

    const next = newRequest('req-after-poison');
    airGappedQrExchangeRequests$.next(next.request);
    const nextRequested = h.emitted.find(
      action =>
        (action as { type: string }).type ===
          actions.airGappedQrExchange.requested.type &&
        (action as ReturnType<typeof actions.airGappedQrExchange.requested>)
          .payload.requestId === 'req-after-poison',
    );
    expect(nextRequested).toBeDefined();

    sub.unsubscribe();
  });

  it('queues a second exchange until the first settles', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const first = newRequest('req-a');
    const second = newRequest('req-b');

    airGappedQrExchangeRequests$.next(first.request);
    airGappedQrExchangeRequests$.next(second.request);

    expect(h.emitted).toHaveLength(1);
    expect(
      (h.emitted[0] as ReturnType<typeof actions.airGappedQrExchange.requested>)
        .payload.requestId,
    ).toBe('req-a');

    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-a',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(first.spy.completed).toBe(true);
    const requestedForSecond = h.emitted.find(
      action =>
        (action as { type: string }).type ===
          actions.airGappedQrExchange.requested.type &&
        (action as ReturnType<typeof actions.airGappedQrExchange.requested>)
          .payload.requestId === 'req-b',
    );
    expect(requestedForSecond).toBeDefined();
    expect(second.spy.values).toHaveLength(0);

    sub.unsubscribe();
  });

  it('resolves the trigger with the reassembled response on scanCompleted', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-3');

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-3',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(spy.values).toHaveLength(1);
    expect(spy.values[0].urType).toBe(RESPONSE_TYPE);
    expect(Array.from(spy.values[0].cbor)).toEqual(Array.from(RESPONSE_CBOR));
    expect(spy.completed).toBe(true);

    sub.unsubscribe();
  });

  it('ignores a scanCompleted for a different requestId', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-4');

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'other',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(spy.values).toHaveLength(0);
    expect(spy.completed).toBe(false);

    sub.unsubscribe();
  });

  it('ignores a scanCompleted whose urType does not match', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-5');

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-5',
        urType: 'unexpected-type',
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(spy.values).toHaveLength(0);
    expect(spy.completed).toBe(false);

    sub.unsubscribe();
  });

  it('resolves when the response type is a member of an array expectedResponseType', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-array-1', [
      'crypto-hdkey',
      'crypto-account',
    ]);

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-array-1',
        urType: 'crypto-account',
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(spy.values).toHaveLength(1);
    expect(spy.values[0].urType).toBe('crypto-account');
    expect(spy.completed).toBe(true);

    sub.unsubscribe();
  });

  it('drops a response whose type is in neither member of an array expectedResponseType', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-array-2', [
      'crypto-hdkey',
      'crypto-account',
    ]);

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-array-2',
        urType: 'crypto-psbt',
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(spy.values).toHaveLength(0);
    expect(spy.completed).toBe(false);

    sub.unsubscribe();
  });

  it('errors the trigger with a cancelled error on cancelled', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-6');

    airGappedQrExchangeRequests$.next(request);
    h.cancelled$.next(
      actions.airGappedQrExchange.cancelled({ requestId: 'req-6' }),
    );

    expect(spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);
    expect(spy.values).toHaveLength(0);

    sub.unsubscribe();
  });

  it('errors the trigger with the message on failed', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-7');

    airGappedQrExchangeRequests$.next(request);
    h.failed$.next(
      actions.airGappedQrExchange.failed({
        requestId: 'req-7',
        message: 'reassembly failed',
      }),
    );

    expect(spy.error).toBeInstanceOf(Error);
    expect((spy.error as Error).message).toBe('reassembly failed');

    sub.unsubscribe();
  });

  it('errors the trigger and clears pending when the scanner tab disconnects', () => {
    const h = makeHarness(true);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-8');

    airGappedQrExchangeRequests$.next(request);
    const scannerViewId = 'view-77' as unknown as ViewId;
    h.selectOpenViews$.next([
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    // Production ordering: the views reducer removes the view from state
    // before the viewDisconnected action reaches side effects.
    h.selectOpenViews$.next([]);
    h.viewDisconnected$.next({ payload: scannerViewId });

    expect(spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);
    const last = h.emitted[h.emitted.length - 1] as ReturnType<
      typeof actions.airGappedQrExchange.cancelled
    >;
    expect(last).toEqual(
      actions.airGappedQrExchange.cancelled({ requestId: 'req-8' }),
    );

    sub.unsubscribe();
  });

  it('closes the scanner tab on scanCompleted on the extension', () => {
    const scannerViewId = 'tab-1' as unknown as ViewId;
    const h = makeHarness(true, [
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    const sub = h.subscribe();
    const { request } = newRequest('req-close-1');

    airGappedQrExchangeRequests$.next(request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-close-1',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );

    expect(h.emitted).toContainEqual(actions.views.closeView(scannerViewId));

    sub.unsubscribe();
  });

  it('closes the scanner tab on cancelled on the extension', () => {
    const scannerViewId = 'tab-2' as unknown as ViewId;
    const h = makeHarness(true, [
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    const sub = h.subscribe();
    const { request } = newRequest('req-close-2');

    airGappedQrExchangeRequests$.next(request);
    h.cancelled$.next(
      actions.airGappedQrExchange.cancelled({ requestId: 'req-close-2' }),
    );

    expect(h.emitted).toContainEqual(actions.views.closeView(scannerViewId));

    sub.unsubscribe();
  });

  it('settles without a closeView when the scanner tab is already gone on the extension', () => {
    const h = makeHarness(true, []);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-close-3');

    airGappedQrExchangeRequests$.next(request);
    h.cancelled$.next(
      actions.airGappedQrExchange.cancelled({ requestId: 'req-close-3' }),
    );

    expect(spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);
    expect(
      h.emitted.some(
        action =>
          (action as { type: string }).type === actions.views.closeView.type,
      ),
    ).toBe(false);

    sub.unsubscribe();
  });

  it('does not cancel when a non-scanner view disconnects', () => {
    const h = makeHarness(true);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-9');

    airGappedQrExchangeRequests$.next(request);
    const scannerViewId = 'view-1' as unknown as ViewId;
    const popupViewId = 'popup-1' as unknown as ViewId;
    h.selectOpenViews$.next([
      { id: scannerViewId, location: SCANNER_LOCATION },
      { id: popupViewId, location: '/' },
    ]);
    h.selectOpenViews$.next([
      { id: scannerViewId, location: SCANNER_LOCATION },
    ]);
    h.viewDisconnected$.next({ payload: popupViewId });

    expect(spy.error).toBeUndefined();
    expect(spy.completed).toBe(false);

    sub.unsubscribe();
  });

  it('ignores viewDisconnected entirely on mobile', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const { request, spy } = newRequest('req-10');

    airGappedQrExchangeRequests$.next(request);
    h.selectOpenViews$.next([]);
    h.viewDisconnected$.next({ payload: 'whatever' as unknown as ViewId });

    expect(spy.error).toBeUndefined();

    sub.unsubscribe();
  });

  it('uses prebuilt frames when the request supplies them', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();
    const result$ = new Subject<AirGappedQrExchangeResult>();
    const frames = [
      'ur:cardano-sign-request/1-2/a',
      'ur:cardano-sign-request/2-2/b',
    ];

    airGappedQrExchangeRequests$.next({
      requestId: 'req-11',
      options: {
        request: { frames },
        expectedResponseType: RESPONSE_TYPE,
      },
      result$,
    });

    const requested = h.emitted[0] as ReturnType<
      typeof actions.airGappedQrExchange.requested
    >;
    expect(requested.payload.frames).toEqual(frames);

    sub.unsubscribe();
  });

  it('handles two sequential exchanges on the same subscription', () => {
    const h = makeHarness(false);
    const sub = h.subscribe();

    const first = newRequest('req-12');
    airGappedQrExchangeRequests$.next(first.request);
    h.scanCompleted$.next(
      actions.airGappedQrExchange.scanCompleted({
        requestId: 'req-12',
        urType: RESPONSE_TYPE,
        cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
      }),
    );
    expect(first.spy.completed).toBe(true);

    const second = newRequest('req-13');
    airGappedQrExchangeRequests$.next(second.request);
    h.cancelled$.next(
      actions.airGappedQrExchange.cancelled({ requestId: 'req-13' }),
    );
    expect(second.spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);

    sub.unsubscribe();
  });

  describe('marble timing', () => {
    const scannerView: View = {
      id: 'view-77' as unknown as ViewId,
      location: SCANNER_LOCATION,
      type: 'tab',
    };
    const popupView: View = {
      id: 'popup-1' as unknown as ViewId,
      location: '/',
      type: 'popupWindow',
    };
    const actionType = map(
      (action: unknown) => (action as { type: string }).type,
    );

    const expectMobileSettleToReleaseSubscriptions = (
      terminal: 'cancelled' | 'failed' | 'scanCompleted',
    ) => {
      const { request, spy } = newRequest('req-leak');
      testSideEffect(
        makeAirGappedQrExchangeSideEffect({
          opensScannerTab: false,
          scannerLocation: SCANNER_LOCATION,
        }),
        ({ hot, expectObservable, expectSubscriptions }) => {
          const marbleFor = (branch: string) =>
            branch === terminal ? '--t' : '---';
          const scanCompleted$ = hot(marbleFor('scanCompleted'), {
            t: actions.airGappedQrExchange.scanCompleted({
              requestId: 'req-leak',
              urType: RESPONSE_TYPE,
              cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
            }),
          });
          const cancelled$ = hot(marbleFor('cancelled'), {
            t: actions.airGappedQrExchange.cancelled({
              requestId: 'req-leak',
            }),
          });
          const failed$ = hot(marbleFor('failed'), {
            t: actions.airGappedQrExchange.failed({
              requestId: 'req-leak',
              message: 'boom',
            }),
          });
          hot('-r').subscribe(() => {
            airGappedQrExchangeRequests$.next(request);
          });
          return {
            actionObservables: {
              airGappedQrExchange: { scanCompleted$, cancelled$, failed$ },
              views: {
                viewDisconnected$:
                  hot<ReturnType<typeof actions.views.viewDisconnected>>('---'),
              },
            },
            stateObservables: {
              views: { selectOpenViews$: hot<View[]>('---') },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$.pipe(actionType)).toBe('-r', {
                r: actions.airGappedQrExchange.requested.type,
              });
              expectSubscriptions(scanCompleted$.subscriptions).toBe('-^!');
              expectSubscriptions(cancelled$.subscriptions).toBe('-^!');
              expectSubscriptions(failed$.subscriptions).toBe('-^!');
            },
          };
        },
      );
      return spy;
    };

    it('completes the exchange and releases action subscriptions on mobile after scanCompleted', () => {
      const spy = expectMobileSettleToReleaseSubscriptions('scanCompleted');
      expect(spy.completed).toBe(true);
    });

    it('completes the exchange and releases action subscriptions on mobile after cancelled', () => {
      const spy = expectMobileSettleToReleaseSubscriptions('cancelled');
      expect(spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);
    });

    it('completes the exchange and releases action subscriptions on mobile after failed', () => {
      const spy = expectMobileSettleToReleaseSubscriptions('failed');
      expect((spy.error as Error).message).toBe('boom');
    });

    it('closes the scanner tab and releases subscriptions on the extension after scanCompleted', () => {
      const { request, spy } = newRequest('req-ext-close');
      testSideEffect(
        makeAirGappedQrExchangeSideEffect({
          opensScannerTab: true,
          scannerLocation: SCANNER_LOCATION,
        }),
        ({ hot, cold, expectObservable, expectSubscriptions }) => {
          const scanCompleted$ = hot('-----t', {
            t: actions.airGappedQrExchange.scanCompleted({
              requestId: 'req-ext-close',
              urType: RESPONSE_TYPE,
              cborHex: HexBytes.fromByteArray(RESPONSE_CBOR),
            }),
          });
          const viewDisconnected$ =
            hot<ReturnType<typeof actions.views.viewDisconnected>>('------');
          hot('-r').subscribe(() => {
            airGappedQrExchangeRequests$.next(request);
          });
          return {
            actionObservables: {
              airGappedQrExchange: {
                scanCompleted$,
                cancelled$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.cancelled>>(
                    '------',
                  ),
                failed$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.failed>>(
                    '------',
                  ),
              },
              views: { viewDisconnected$ },
            },
            stateObservables: {
              views: { selectOpenViews$: cold('v', { v: [scannerView] }) },
            },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$.pipe(actionType)).toBe('-(ro)c', {
                r: actions.airGappedQrExchange.requested.type,
                o: actions.views.openView.type,
                c: actions.views.closeView.type,
              });
              expectSubscriptions(scanCompleted$.subscriptions).toBe('-^---!');
              expectSubscriptions(viewDisconnected$.subscriptions).toBe(
                '-^---!',
              );
            },
          };
        },
      );
      expect(spy.completed).toBe(true);
    });

    it('cancels the exchange on scanner disconnect with the view already removed from state', () => {
      const { request, spy } = newRequest('req-a-disc');
      testSideEffect(
        makeAirGappedQrExchangeSideEffect({
          opensScannerTab: true,
          scannerLocation: SCANNER_LOCATION,
        }),
        ({ hot, expectObservable, expectSubscriptions }) => {
          const selectOpenViews$ = hot<View[]>('e--s-e-', {
            e: [],
            s: [scannerView],
          });
          const viewDisconnected$ = hot('------d', {
            d: actions.views.viewDisconnected(scannerView.id),
          });
          hot('-r').subscribe(() => {
            airGappedQrExchangeRequests$.next(request);
          });
          return {
            actionObservables: {
              airGappedQrExchange: {
                scanCompleted$:
                  hot<
                    ReturnType<typeof actions.airGappedQrExchange.scanCompleted>
                  >('-------'),
                cancelled$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.cancelled>>(
                    '-------',
                  ),
                failed$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.failed>>(
                    '-------',
                  ),
              },
              views: { viewDisconnected$ },
            },
            stateObservables: { views: { selectOpenViews$ } },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$.pipe(actionType)).toBe('-(ro)-c', {
                r: actions.airGappedQrExchange.requested.type,
                o: actions.views.openView.type,
                c: actions.airGappedQrExchange.cancelled.type,
              });
              expectSubscriptions(viewDisconnected$.subscriptions).toBe(
                '---^--!',
              );
            },
          };
        },
      );
      expect(spy.error).toBeInstanceOf(AirGappedQrExchangeCancelledError);
    });

    it('keeps the exchange pending when an unrelated view disconnects after removal from state', () => {
      const { request, spy } = newRequest('req-a-unrelated');
      testSideEffect(
        makeAirGappedQrExchangeSideEffect({
          opensScannerTab: true,
          scannerLocation: SCANNER_LOCATION,
        }),
        ({ hot, expectObservable, expectSubscriptions }) => {
          const selectOpenViews$ = hot<View[]>('---b-s-', {
            b: [popupView, scannerView],
            s: [scannerView],
          });
          const viewDisconnected$ = hot('------d', {
            d: actions.views.viewDisconnected(popupView.id),
          });
          hot('-r').subscribe(() => {
            airGappedQrExchangeRequests$.next(request);
          });
          return {
            actionObservables: {
              airGappedQrExchange: {
                scanCompleted$:
                  hot<
                    ReturnType<typeof actions.airGappedQrExchange.scanCompleted>
                  >('-------'),
                cancelled$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.cancelled>>(
                    '-------',
                  ),
                failed$:
                  hot<ReturnType<typeof actions.airGappedQrExchange.failed>>(
                    '-------',
                  ),
              },
              views: { viewDisconnected$ },
            },
            stateObservables: { views: { selectOpenViews$ } },
            dependencies: { actions },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$.pipe(actionType)).toBe('-(ro)', {
                r: actions.airGappedQrExchange.requested.type,
                o: actions.views.openView.type,
              });
              expectSubscriptions(viewDisconnected$.subscriptions).toBe('---^');
            },
          };
        },
      );
      expect(spy.error).toBeUndefined();
      expect(spy.completed).toBe(false);
    });
  });
});
