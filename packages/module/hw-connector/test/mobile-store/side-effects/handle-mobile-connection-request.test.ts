import { firstValueFrom, lastValueFrom, NEVER, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  HwConnectionCancelledError,
  HwSearchFailedError,
} from '../../../src/mobile-store/errors';
import { hwConnectorMobileActions as actions } from '../../../src/mobile-store/slice';

import type { TranslationKey } from '@lace-contract/i18n';
import type { DeviceDescriptor } from '@lace-lib/util-hw';
import type { Observable } from 'rxjs';

const { triggerHandlerRef } = vi.hoisted(() => ({
  triggerHandlerRef: {
    current: undefined as (() => Observable<DeviceDescriptor>) | undefined,
  },
}));

vi.mock('../../../src/addons/request-hw-connection-mobile', () => ({
  requestHWConnectionHook: {
    onRequest: (handler: () => Observable<DeviceDescriptor>) => {
      triggerHandlerRef.current = handler;
      return NEVER;
    },
  },
}));

// Imported after the mock so the side effect picks up the stubbed hook.
// eslint-disable-next-line import/order
import { handleMobileConnectionRequest } from '../../../src/mobile-store/side-effects/handle-mobile-connection-request';

const bleDescriptor: DeviceDescriptor = {
  kind: 'ble',
  vendorName: 'ledger',
  id: 'AA:BB',
  name: 'Ledger',
};

const setupSideEffect = (overrides?: {
  deviceSelected$?: Observable<
    ReturnType<typeof actions.hwConnectorMobile.deviceSelected>
  >;
  cancel$?: Observable<ReturnType<typeof actions.hwConnectorMobile.cancel>>;
  errored$?: Observable<ReturnType<typeof actions.hwConnectorMobile.errored>>;
}) => {
  triggerHandlerRef.current = undefined;
  const sideEffect$ = handleMobileConnectionRequest(
    {
      hwConnectorMobile: {
        deviceSelected$: overrides?.deviceSelected$ ?? NEVER,
        cancel$: overrides?.cancel$ ?? NEVER,
        errored$: overrides?.errored$ ?? NEVER,
      },
    } as never,
    {} as never,
    { actions } as never,
  );
  return sideEffect$;
};

describe('handleMobileConnectionRequest', () => {
  it('dispatches connectionRequested when an HW connection is requested', async () => {
    const deviceSelected$ = new Subject<
      ReturnType<typeof actions.hwConnectorMobile.deviceSelected>
    >();
    const sideEffect$ = setupSideEffect({ deviceSelected$ });

    const firstAction = firstValueFrom(sideEffect$);
    triggerHandlerRef.current?.();

    expect(await firstAction).toEqual(
      actions.hwConnectorMobile.connectionRequested(),
    );
  });

  it('resolves the request observable with the descriptor on deviceSelected', async () => {
    const deviceSelected$ = of(
      actions.hwConnectorMobile.deviceSelected({ device: bleDescriptor }),
    );
    setupSideEffect({ deviceSelected$ });

    const result$ = triggerHandlerRef.current?.();
    expect(
      await firstValueFrom(result$ as Observable<DeviceDescriptor>),
    ).toEqual(bleDescriptor);
  });

  it('rejects the request observable with HwConnectionCancelledError on cancel', async () => {
    const cancel$ = of(actions.hwConnectorMobile.cancel());
    setupSideEffect({ cancel$ });

    const result$ = triggerHandlerRef.current?.();
    await expect(
      lastValueFrom(result$ as Observable<DeviceDescriptor>),
    ).rejects.toBeInstanceOf(HwConnectionCancelledError);
  });

  it('rejects with HwSearchFailedError carrying the translation key on errored', async () => {
    const errorTranslationKey =
      'v2.hardware-wallet.error.search-failed' as TranslationKey;
    const errored$ = of(
      actions.hwConnectorMobile.errored({ errorTranslationKey }),
    );
    setupSideEffect({ errored$ });

    const result$ = triggerHandlerRef.current?.();
    const settled = await lastValueFrom(
      result$ as Observable<DeviceDescriptor>,
    ).catch((error: unknown) => error);
    expect(settled).toBeInstanceOf(HwSearchFailedError);
    expect((settled as HwSearchFailedError).translationKey).toBe(
      errorTranslationKey,
    );
  });
});
