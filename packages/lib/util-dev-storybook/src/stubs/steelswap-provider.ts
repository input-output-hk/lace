import { FeatureFlagKey } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import {
  swapProviderDependencyContract,
  type SwapProvider,
} from '@lace-contract/swap-provider';
import { Ok } from '@lace-lib/util';
import { NEVER, of } from 'rxjs';

import type { LaceModuleMap } from '@lace-contract/module';

const FEATURE_FLAG_SWAP_CENTER = FeatureFlagKey('SWAP_CENTER');

// `getQuote` and `buildSwapTx` return NEVER so the consuming side
// effects (`makeFetchQuote`, build flow in
// swap-context/src/store/side-effects.ts) stay pending forever and never
// dispatch `quotesReceived` / `buildCompleted`. Stories drive these
// transitions explicitly via `swapContextActions`; a stub `of(Ok(...))`
// here would race the story's manual dispatch and overwrite intended
// terminal states (e.g. `quoteFailed` → 'Error' clobbered by the
// stub-fed `quotesReceived` → 'Quoted').
//
// List methods stay `Ok([])` — their side effects short-circuit on
// empty arrays (`allDexes.length === 0 → return of()`), so no dispatch
// fires.
const stubSwapProvider: SwapProvider = {
  getQuote: () => NEVER,
  buildSwapTx: () => NEVER,
  listTokens: () => of(Ok([])),
  listDexes: () => of(Ok([])),
  searchTokens: () => of(Ok([])),
};

const store = {
  context: {
    actions: {},
    selectors: {},
  },
  load: async () => ({
    default: async () => ({
      sideEffectDependencies: {
        swapProviders: [stubSwapProvider],
      },
    }),
  }),
};

const sharedModule = inferModuleContext({
  moduleName: ModuleName('swap-provider-steelswap'),
  dependsOn: combineContracts([] as const),
  implements: combineContracts([swapProviderDependencyContract] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_SWAP_CENTER),
    metadata: {
      name: 'SteelSwap Provider (Stub)',
      description: 'Stub SteelSwap provider for Storybook',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export const stubSteelSwapProviderModule = moduleMap;
