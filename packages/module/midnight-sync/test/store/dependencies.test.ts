import { setImmediate } from 'node:timers/promises';

import { midnightWallets$ } from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstValueFrom, NEVER, of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initializeMidnightSideEffectDependencies } from '../../src/store/dependencies';

import type { MidnightWallet } from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';

const { midnightAccount } = stubData;
const midnightSideEffectDependencies = initializeMidnightSideEffectDependencies(
  {} as Readonly<ModuleInitProps>,
  { logger: dummyLogger },
);

describe('Midnight side effect dependencies', () => {
  beforeEach(() => {
    midnightWallets$.next({});
    vi.clearAllMocks();
  });

  describe('stopAllMidnightWallets', () => {
    it('stops all wallets', async () => {
      const mockStop1 = vi.fn().mockReturnValue(of(undefined));
      const mockStop2 = vi.fn().mockReturnValue(of(undefined));
      const mockWallet1 = {
        accountId: midnightAccount.accountId,
        stop: mockStop1,
      } as unknown as MidnightWallet;
      const otherAccountId = AccountId('other-account-id');
      const mockWallet2 = {
        accountId: otherAccountId,
        stop: mockStop2,
      } as unknown as MidnightWallet;

      midnightWallets$.next({
        [midnightAccount.accountId]: mockWallet1,
        [otherAccountId]: mockWallet2,
      });
      await firstValueFrom(
        midnightSideEffectDependencies.stopAllMidnightWallets(),
      );

      expect(mockStop1).toHaveBeenCalledOnce();
      expect(mockStop2).toHaveBeenCalledOnce();
    });

    it('emits empty map to the wallet stream', async () => {
      const mockWallet = {
        accountId: midnightAccount.accountId,
        stop: vi.fn().mockReturnValue(of(undefined)),
      } as unknown as MidnightWallet;

      midnightWallets$.next({
        [midnightAccount.accountId]: mockWallet,
      });
      midnightSideEffectDependencies.stopAllMidnightWallets().subscribe();
      await setImmediate();

      expect(
        await firstValueFrom(midnightSideEffectDependencies.midnightWallets$),
      ).toEqual({});
    });

    it('does nothing when no wallets exist', async () => {
      midnightWallets$.next({});

      await expect(
        firstValueFrom(midnightSideEffectDependencies.stopAllMidnightWallets()),
      ).resolves.toBeUndefined();
    });
  });

  describe('stopMidnightWallet', () => {
    const otherAccountId = AccountId('other-account-id');

    const registerWallets = () => {
      const stop = vi.fn().mockReturnValue(of(undefined));
      const otherStop = vi.fn().mockReturnValue(of(undefined));
      midnightWallets$.next({
        [midnightAccount.accountId]: {
          accountId: midnightAccount.accountId,
          stop,
        } as unknown as MidnightWallet,
        [otherAccountId]: {
          accountId: otherAccountId,
          stop: otherStop,
        } as unknown as MidnightWallet,
      });
      return { stop, otherStop };
    };

    it('stops only the targeted wallet and deregisters it', async () => {
      const { stop, otherStop } = registerWallets();

      await firstValueFrom(
        midnightSideEffectDependencies.stopMidnightWallet(
          midnightAccount.accountId,
        ),
      );

      expect(stop).toHaveBeenCalledOnce();
      expect(otherStop).not.toHaveBeenCalled();
      expect(Object.keys(midnightWallets$.value)).toEqual([otherAccountId]);
    });

    it('deregisters before the wallet reports it has stopped', async () => {
      const stop = vi.fn().mockReturnValue(NEVER);
      midnightWallets$.next({
        [midnightAccount.accountId]: {
          accountId: midnightAccount.accountId,
          stop,
        } as unknown as MidnightWallet,
      });

      midnightSideEffectDependencies
        .stopMidnightWallet(midnightAccount.accountId)
        .subscribe();
      await setImmediate();

      expect(midnightWallets$.value).toEqual({});
    });

    it('completes without error when the account has no running wallet', async () => {
      midnightWallets$.next({});

      await expect(
        firstValueFrom(
          midnightSideEffectDependencies.stopMidnightWallet(
            midnightAccount.accountId,
          ),
        ),
      ).resolves.toBeUndefined();
    });
  });
});
