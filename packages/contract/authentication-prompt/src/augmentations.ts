import type { DeferBiometricPromptUntilActiveExtension } from './defer-biometric-prompt-until-active';
import type { LocalAuthenticationDependency } from './local-authentication';
import type {
  AuthSecretVerifier,
  authenticationPromptReducers,
  AuthenticationPromptSideEffectDependencies,
  InternalAuthSecretApiExtension,
} from './store';
import type { propagateAuthSecret } from './store/auth-secret-accessor';
import type { RenderAuthPromptUI } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State
    extends StateFromReducersMapObject<typeof authenticationPromptReducers> {}

  interface LaceAddons {
    readonly loadAuthSecretVerifier: DynamicallyLoadedInit<AuthSecretVerifier>;
    readonly loadAuthenticationPromptInternalAuthSecretApiExtension: DynamicallyLoadedInit<InternalAuthSecretApiExtension>;
    readonly loadDeferBiometricPromptUntilActive: DynamicallyLoadedInit<DeferBiometricPromptUntilActiveExtension>;
    readonly loadRenderAuthPromptUI: DynamicallyLoadedInit<RenderAuthPromptUI>;
  }

  interface SideEffectDependencies
    extends AuthenticationPromptSideEffectDependencies {
    localAuthentication: LocalAuthenticationDependency;
    propagateAuthSecret: typeof propagateAuthSecret;
  }
}
