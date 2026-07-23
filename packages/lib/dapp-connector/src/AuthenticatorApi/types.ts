import type { Runtime } from 'webextension-polyfill';

// Not 'Tagged' string to be compatible with webextension-polyfill types
export type Origin = string;

/**
 * Options for requestAccess method.
 */
export interface RequestAccessOptions {
  /**
   * Force showing the authorization popup even if the dApp is already authorized.
   * Useful for ensuring fresh user consent on reconnection.
   */
  forceReauth?: boolean;
}

/** Resolve true to authorise access to the WalletAPI, or resolve false to deny. Errors: `ApiError` */
export type RequestAccess = (
  sender: Runtime.MessageSender,
  options?: RequestAccessOptions,
) => Promise<boolean>;
export type HaveAccess = (sender: Runtime.MessageSender) => Promise<boolean>;

export interface AuthenticatorApi {
  haveAccess: HaveAccess;
  requestAccess: RequestAccess;
}

type RemoteRequestAccess = (options?: RequestAccessOptions) => Promise<boolean>;
type RemoteHaveAccess = () => Promise<boolean>;

/**
 * This is different to Authenticator, because methods don't have 'origin' arg.
 * This authenticator is intended to be used to authenticate yourself, from a content-script etc.
 *
 * Methods must never throw.
 */
export interface RemoteAuthenticator {
  haveAccess: RemoteHaveAccess;
  requestAccess: RemoteRequestAccess;
}

export type RemoteAuthenticatorMethod = keyof RemoteAuthenticator;
