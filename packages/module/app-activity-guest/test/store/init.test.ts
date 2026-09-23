import { firstValueFrom, toArray } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import storeContext from '../../src/store';
import initializeStore from '../../src/store/init';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';

const stubDocumentReload = () => {
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload } });
  return reload;
};

const initialize = async () => {
  const { sideEffectDependencies } = await initializeStore(
    {} as ModuleInitProps,
    {} as ModuleInitDependencies,
  );
  return sideEffectDependencies!;
};

describe('app-activity-guest:store', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('code-splits the store init behind a dynamic import', async () => {
    await expect(storeContext.load()).resolves.toHaveProperty('default');
  });

  it('exposes no actions or selectors of its own', () => {
    expect(storeContext.context).toEqual({ actions: {}, selectors: {} });
  });

  it('reloads the document on subscription, not on call', async () => {
    const reload = stubDocumentReload();
    const { performAppReload } = await initialize();

    const reload$ = performAppReload!();
    expect(reload).not.toHaveBeenCalled();

    expect(await firstValueFrom(reload$.pipe(toArray()))).toEqual([]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once per subscription', async () => {
    const reload = stubDocumentReload();
    const { performAppReload } = await initialize();
    const reload$ = performAppReload!();

    await firstValueFrom(reload$.pipe(toArray()));
    await firstValueFrom(reload$.pipe(toArray()));

    expect(reload).toHaveBeenCalledTimes(2);
  });
});
