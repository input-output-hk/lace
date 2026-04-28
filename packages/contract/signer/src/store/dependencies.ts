import '../augmentations';

import { CompositeSignerFactory } from '../composite-signer-factory';

import type { LaceInit } from '@lace-contract/module';

interface SignerSideEffectDependencies {
  signerFactory: CompositeSignerFactory;
}

export const initializeSignerSideEffectDependencies: LaceInit<
  SignerSideEffectDependencies
> = async ({ loadModules }) => {
  const signerFactories = await loadModules('addons.loadSignerFactory');

  return {
    signerFactory: new CompositeSignerFactory(signerFactories),
  };
};
