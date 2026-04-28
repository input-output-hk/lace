import './augmentations';

export * from './contract';
export type { DeferBiometricPromptUntilActiveExtension } from './defer-biometric-prompt-until-active';
export type * from './local-authentication';
export {
  authenticationPromptActions,
  authenticationPromptSelectors,
  sendAuthSecretApi,
} from './store';
export type * from './store';
export * from './test-utils';
export * from './hooks';
export * from './value-objects';
export * from './utils';
export { createSecureStorePasswordManager } from './authenticators/password/secure-store-password-manager';
export type { RenderAuthPromptUI } from './types';
export { AuthPromptUI } from './AuthPromptUI';
