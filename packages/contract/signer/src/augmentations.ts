import type { SignerFactory } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';

declare module '@lace-contract/module' {
  interface LaceAddons {
    readonly loadSignerFactory: DynamicallyLoadedInit<SignerFactory>;
  }

  interface SideEffectDependencies {
    signerFactory: SignerFactory;
  }
}
