import { AuthenticatorApi } from '@cardano-sdk/dapp-connector';

/**
 * cip30 messaging is calling authenticator `haveAccess` on every cip30 request
 * we're using it to keep track whether dapp connector is currently active
 */
export const notifyOnHaveAccessCall = (authenticator: AuthenticatorApi, notify: () => void): AuthenticatorApi => ({
  requestAccess: authenticator.requestAccess.bind(authenticator),
  revokeAccess: authenticator.revokeAccess.bind(authenticator),
  haveAccess(...args) {
    notify();
    return authenticator.haveAccess(...args);
  }
});
