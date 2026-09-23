import { firstValueFrom, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';

import storeContext from '../../src/store';
import initializeStore from '../../src/store/init';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';

const initialize = async () => {
  const { sideEffectDependencies } = await initializeStore(
    {} as ModuleInitProps,
    {} as ModuleInitDependencies,
  );
  return sideEffectDependencies!;
};

describe('host-auth:store', () => {
  it('code-splits the store init behind a dynamic import', async () => {
    await expect(storeContext.load()).resolves.toHaveProperty('default');
  });

  it('exposes no actions or selectors of its own', () => {
    expect(storeContext.context).toEqual({ actions: {}, selectors: {} });
  });

  it('reports the wallet permanently active', async () => {
    const { isWalletActive$ } = await initialize();

    expect(await firstValueFrom(isWalletActive$!.pipe(toArray()))).toEqual([
      true,
    ]);
  });

  it('never emits a resume, because the guest runs no lock transition', async () => {
    const { walletResumed$ } = await initialize();
    const emissions: void[] = [];
    let isCompleted = false;

    const subscription = walletResumed$!.subscribe({
      next: value => emissions.push(value),
      complete: () => {
        isCompleted = true;
      },
    });
    await Promise.resolve();

    expect(emissions).toEqual([]);
    expect(isCompleted).toBe(false);
    subscription.unsubscribe();
  });
});
