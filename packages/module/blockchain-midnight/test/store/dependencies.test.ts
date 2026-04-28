import { setImmediate } from 'node:timers/promises';

import { midnightWallets$ } from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { AccountId } from '@lace-contract/wallet-repo';
import { firstValueFrom, of } from 'rxjs';
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
});
