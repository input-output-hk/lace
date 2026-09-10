import { BitcoinWalletResolver } from '../wallet-resolver';

import { initializeDependencies } from './dependencies';
import { feedBitcoinResolver } from './side-effects/feed-resolver';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const redux: LaceInit<LaceModuleStoreInit> = async (props, dependencies) => {
  // Shared between the composite provider (address → account resolution) and
  // the side effect that keeps it fed from wallet-repo state (host projection). Held in
  // this closure rather than a module singleton so it never leaks across boots.
  const resolver = new BitcoinWalletResolver();
  return {
    sideEffects: [feedBitcoinResolver(resolver)],
    sideEffectDependencies: await initializeDependencies(
      props,
      dependencies,
      resolver,
    ),
  };
};

export default redux;
