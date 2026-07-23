import { describe, expect, it } from 'vitest';

import {
  airGappedQrExchangeRequests$,
  triggerAirGappedQrExchange,
} from '../../src/store/request';
import { airGappedQrExchangeHook } from '../../src/trigger';

import type { AirGappedQrExchangeRequest } from '../../src/store/request';
import type {
  AirGappedQrExchangeOptions,
  AirGappedQrExchangeResult,
} from '../../src/types';

const OPTIONS: AirGappedQrExchangeOptions = {
  request: { frames: ['ur:cardano-sign-request/1-1/a'] },
  expectedResponseType: 'cardano-sign-response',
};

describe('triggerAirGappedQrExchange', () => {
  it('pushes a request with a stable id and the given options, then resolves once', () => {
    const requests: AirGappedQrExchangeRequest[] = [];
    const sub = airGappedQrExchangeRequests$.subscribe(request =>
      requests.push(request),
    );

    const values: AirGappedQrExchangeResult[] = [];
    let hasCompleted = false;
    const triggerSub = triggerAirGappedQrExchange(OPTIONS).subscribe({
      next: value => values.push(value),
      complete: () => {
        hasCompleted = true;
      },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].requestId).toEqual(expect.any(String));
    expect(requests[0].options).toEqual(OPTIONS);

    const result: AirGappedQrExchangeResult = {
      urType: 'cardano-sign-response',
      cbor: new Uint8Array([1, 2, 3]),
    };
    requests[0].result$.next(result);
    requests[0].result$.complete();

    expect(values).toEqual([result]);
    expect(hasCompleted).toBe(true);

    triggerSub.unsubscribe();
    sub.unsubscribe();
  });

  it('is the public hook trigger surface', () => {
    expect(airGappedQrExchangeHook.trigger).toBe(triggerAirGappedQrExchange);
  });
});
