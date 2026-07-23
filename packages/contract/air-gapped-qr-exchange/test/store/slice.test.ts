import { describe, expect, it } from 'vitest';

import {
  airGappedQrExchangeActions,
  airGappedQrExchangeReducers,
  airGappedQrExchangeSelectors,
} from '../../src/store/slice';

import type { PendingAirGappedQrExchange } from '../../src/store/slice';

const reducer = airGappedQrExchangeReducers.airGappedQrExchange;
const actions = airGappedQrExchangeActions.airGappedQrExchange;
const selectors = airGappedQrExchangeSelectors.airGappedQrExchange;

const PENDING: PendingAirGappedQrExchange = {
  requestId: 'req-1',
  frames: ['ur:cardano-sign-request/1-1/a'],
  expectedResponseType: 'cardano-sign-response',
  requestInstructionKey: 'v2.air-gapped-qr-exchange.blind-signing.instruction',
  detail: 'a1b2c3',
};

describe('airGappedQrExchange slice', () => {
  it('starts idle with no pending exchange', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(selectors.selectPending({ airGappedQrExchange: state })).toBeNull();
  });

  it('stores the pending exchange on requested', () => {
    const state = reducer(undefined, actions.requested(PENDING));
    expect(selectors.selectPending({ airGappedQrExchange: state })).toEqual(
      PENDING,
    );
  });

  it('clears the pending exchange on scanCompleted', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(
      requested,
      actions.scanCompleted({
        requestId: 'req-1',
        urType: 'cardano-sign-response',
        cborHex: 'b205',
      }),
    );
    expect(selectors.selectPending({ airGappedQrExchange: state })).toBeNull();
  });

  it('clears the pending exchange on cancelled', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(requested, actions.cancelled({ requestId: 'req-1' }));
    expect(selectors.selectPending({ airGappedQrExchange: state })).toBeNull();
  });

  it('clears the pending exchange on failed', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(
      requested,
      actions.failed({ requestId: 'req-1', message: 'boom' }),
    );
    expect(selectors.selectPending({ airGappedQrExchange: state })).toBeNull();
  });

  it('keeps the pending exchange when scanCompleted carries a stale requestId', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(
      requested,
      actions.scanCompleted({
        requestId: 'req-0',
        urType: 'cardano-sign-response',
        cborHex: 'b205',
      }),
    );
    expect(selectors.selectPending({ airGappedQrExchange: state })).toEqual(
      PENDING,
    );
  });

  it('keeps the pending exchange when cancelled carries a stale requestId', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(requested, actions.cancelled({ requestId: 'req-0' }));
    expect(selectors.selectPending({ airGappedQrExchange: state })).toEqual(
      PENDING,
    );
  });

  it('keeps the pending exchange when failed carries a stale requestId', () => {
    const requested = reducer(undefined, actions.requested(PENDING));
    const state = reducer(
      requested,
      actions.failed({ requestId: 'req-0', message: 'boom' }),
    );
    expect(selectors.selectPending({ airGappedQrExchange: state })).toEqual(
      PENDING,
    );
  });

  it('stays idle when a terminal action arrives with nothing pending', () => {
    const state = reducer(undefined, actions.cancelled({ requestId: 'req-1' }));
    expect(selectors.selectPending({ airGappedQrExchange: state })).toBeNull();
  });
});
