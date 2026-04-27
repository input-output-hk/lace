import { emip3decrypt } from '@cardano-sdk/key-management';
import { appLockActions as actions } from '@lace-contract/app-lock';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import { ViewId } from '@lace-contract/module';
import { viewsActions, SidePanelViewId } from '@lace-contract/views';
import { testSideEffect } from '@lace-lib/util-dev';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import { lastValueFrom, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyAuthSecretHook } from '../../src/addons/auth-secret-verifier';
import { appLockSetupHook } from '../../src/addons/setup-app-lock';
import {
  closePopupsOnLock,
  makeSetupAppLock,
  verifyAuthSecret,
} from '../../src/store/side-effects';

import type { Subscription } from 'rxjs';

vi.mock('@cardano-sdk/key-management', () => ({
  emip3decrypt: vi.fn(),
  emip3encrypt: vi.fn(),
}));

const testAuthSecret = AuthSecret(ByteArray.fromUTF8('test-password'));
const testSentinel = HexBytes('deadbeef');

describe('module app-lock side effects', () => {
  describe('makeSetupAppLock', () => {
    it('stores sentinel, then propagates auth secret, then completes setup — in order', () => {
      const prepareSentinel = vi.fn().mockReturnValue(of(testSentinel));
      const emissions: unknown[] = [];
      const callOrder: string[] = [];
      const propagateAuthSecret = vi.fn(() => {
        callOrder.push('propagateAuthSecret');
      });

      testSideEffect(
        makeSetupAppLock({ prepareSentinel }),
        ({ cold, flush }) => ({
          stateObservables: {
            appLock: {
              isAwaitingSetup$: cold('a', { a: true }),
              selectEncryptedSentinel$: cold('a', { a: testSentinel }),
            },
          },
          dependencies: { actions, propagateAuthSecret },
          assertion: sideEffect$ => {
            sideEffect$.subscribe(action => {
              emissions.push(action);
              callOrder.push(action.type);
            });

            appLockSetupHook.trigger(testAuthSecret).subscribe();
            flush();

            expect(prepareSentinel).toHaveBeenCalledWith(testAuthSecret);
            expect(propagateAuthSecret).toHaveBeenCalledWith(testAuthSecret);
            expect(emissions).toEqual([
              actions.appLock.setEncryptedSentinel(testSentinel),
              actions.appLock.setupCompleted(),
            ]);
            expect(callOrder).toEqual([
              actions.appLock.setEncryptedSentinel.type,
              'propagateAuthSecret',
              actions.appLock.setupCompleted.type,
            ]);
          },
        }),
      );
    });

    it('returns fals when app lock is not awaiting setup', () => {
      const prepareSentinel = vi.fn().mockReturnValue(of(testSentinel));
      const propagateAuthSecret = vi.fn();
      // eslint-disable-next-line @typescript-eslint/naming-convention
      let triggerResult: boolean | undefined;

      testSideEffect(
        makeSetupAppLock({ prepareSentinel }),
        ({ cold, flush }) => ({
          stateObservables: {
            appLock: {
              isAwaitingSetup$: cold('a', { a: false }),
              selectEncryptedSentinel$: cold('a', { a: null }),
            },
          },
          dependencies: { actions, logger: dummyLogger, propagateAuthSecret },
          assertion: sideEffect$ => {
            sideEffect$.subscribe();

            appLockSetupHook
              .trigger(testAuthSecret)
              .subscribe(result => (triggerResult = result));
            flush();

            expect(triggerResult).toBe(false);
            expect(propagateAuthSecret).not.toHaveBeenCalled();
          },
        }),
      );
    });

    it('returns false when sentinel preparation fails', () => {
      const propagateAuthSecret = vi.fn();

      testSideEffect(
        makeSetupAppLock({
          prepareSentinel: () => {
            throw new Error('encryption failed');
          },
        }),
        ({ cold, flush }) => ({
          stateObservables: {
            appLock: {
              isAwaitingSetup$: cold('a', { a: true }),
              selectEncryptedSentinel$: cold('a', { a: null }),
            },
          },
          dependencies: { actions, logger: dummyLogger, propagateAuthSecret },
          assertion: sideEffect$ => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            let triggerResult: boolean | undefined;
            sideEffect$.subscribe();

            appLockSetupHook.trigger(testAuthSecret).subscribe({
              next: result => (triggerResult = result),
            });
            flush();

            expect(triggerResult).toBe(false);
            expect(propagateAuthSecret).not.toHaveBeenCalled();
          },
        }),
      );
    });
  });

  describe('verifyAuthSecret', () => {
    let subscription: Subscription;

    afterEach(() => {
      subscription?.unsubscribe();
      vi.restoreAllMocks();
    });

    it('returns true when decryption succeeds', async () => {
      vi.mocked(emip3decrypt).mockResolvedValue(new Uint8Array([1]));

      subscription = verifyAuthSecret(
        {} as never,
        {
          appLock: { selectEncryptedSentinel$: of(testSentinel) },
        } as never,
        {} as never,
      ).subscribe();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const result = await lastValueFrom(
        verifyAuthSecretHook.trigger({ authSecret: testAuthSecret }),
      );

      expect(result).toBe(true);
      expect(emip3decrypt).toHaveBeenCalledWith(
        ByteArray.fromHex(testSentinel),
        testAuthSecret,
      );
    });

    it('returns false when sentinel is null', async () => {
      subscription = verifyAuthSecret(
        {} as never,
        {
          appLock: { selectEncryptedSentinel$: of(null) },
        } as never,
        {} as never,
      ).subscribe();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const result = await lastValueFrom(
        verifyAuthSecretHook.trigger({ authSecret: testAuthSecret }),
      );

      expect(result).toBe(false);
      expect(emip3decrypt).not.toHaveBeenCalled();
    });

    it('returns false when decryption fails', async () => {
      vi.mocked(emip3decrypt).mockRejectedValue(new Error('decryption failed'));

      subscription = verifyAuthSecret(
        {} as never,
        {
          appLock: { selectEncryptedSentinel$: of(testSentinel) },
        } as never,
        {} as never,
      ).subscribe();

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const result = await lastValueFrom(
        verifyAuthSecretHook.trigger({ authSecret: testAuthSecret }),
      );

      expect(result).toBe(false);
    });
  });

  describe('closePopupsOnLock', () => {
    it('closes all popupWindow views when lock state transitions to Locked', () => {
      const popupView1 = {
        id: ViewId('popup-1'),
        location: '/dapp-connect',
        type: 'popupWindow' as const,
      };
      const popupView2 = {
        id: ViewId('popup-2'),
        location: '/sign-tx',
        type: 'popupWindow' as const,
      };
      const sidePanelView = {
        id: SidePanelViewId(1),
        location: '/main',
        type: 'sidePanel' as const,
      };
      const emissions: unknown[] = [];

      testSideEffect(closePopupsOnLock, ({ cold, flush }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Locked' } }),
          },
          views: {
            selectOpenViews$: cold('a', {
              a: [popupView1, popupView2, sidePanelView],
            }),
          },
        },
        dependencies: {
          actions: { ...actions, ...viewsActions },
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => {
            emissions.push(action);
          });
          flush();

          expect(emissions).toEqual([
            viewsActions.views.closeView(popupView1.id),
            viewsActions.views.closeView(popupView2.id),
          ]);
        },
      }));
    });

    it('does not close views when lock state is not Locked', () => {
      const emissions: unknown[] = [];

      testSideEffect(closePopupsOnLock, ({ cold, flush }) => ({
        stateObservables: {
          appLock: {
            selectLockState$: cold('a', { a: { status: 'Unlocked' } }),
          },
          views: {
            selectOpenViews$: cold('a', { a: [] }),
          },
        },
        dependencies: {
          actions: { ...actions, ...viewsActions },
        },
        assertion: sideEffect$ => {
          sideEffect$.subscribe(action => {
            emissions.push(action);
          });
          flush();

          expect(emissions).toEqual([]);
        },
      }));
    });
  });
});
