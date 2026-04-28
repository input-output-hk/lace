import { ConnectionContextId, DappId } from '@lace-contract/dapp-connector';
import { Observable, Subject } from 'rxjs';

import type {
  AccessRequest,
  ConnectAuthenticatorOptions,
  DappConnection,
  DappConnectorPlatformDependencies,
} from '@lace-contract/dapp-connector';
import type { LaceInitSync } from '@lace-contract/module';

/**
 * Creates a mobile connection context ID from a session identifier.
 *
 * @param sessionId - The session identifier for the mobile connection
 * @returns A ConnectionContextId prefixed with "mobile-session-"
 */
export const MobileConnectionContextId = (sessionId: string) =>
  ConnectionContextId(`mobile-session-${sessionId}`);

/**
 * Creates a mock connect authenticator for mobile platforms.
 *
 * This factory function creates an authenticator that simulates dApp connection requests.
 * In production, this would integrate with WalletConnect or similar protocol for
 * native mobile dApp communication.
 *
 * The mock implementation exposes a global __mockDappRequest function for testing
 * that can be used to simulate incoming dApp connection requests.
 *
 * @param dappConnected$ - Subject to emit when a dApp connection is granted
 * @param _dappDisconnected$ - Subject to emit when a dApp disconnects (unused in mock)
 * @returns A function that creates an Observable of AccessRequest
 */
const createMockConnectAuthenticator =
  (
    dappConnected$: Subject<DappConnection>,
    _dappDisconnected$: Subject<ConnectionContextId>,
  ) =>
  ({ blockchainName }: ConnectAuthenticatorOptions) => {
    return new Observable<AccessRequest>(subscriber => {
      const mockDappRequest = () => {
        const mockDapp = {
          id: DappId('mock-dapp-origin'),
          name: 'Mock Test DApp',
          origin: 'https://mock-dapp.example.com',
          imageUrl: '',
        };

        subscriber.next({
          dapp: mockDapp,
          done: (granted: boolean) => {
            if (granted) {
              dappConnected$.next({
                blockchainName,
                source: {
                  url: mockDapp.origin,
                  contextId: MobileConnectionContextId('test-session'),
                },
              });
            }
          },
        });
      };

      (globalThis as Record<string, unknown>).__mockDappRequest =
        mockDappRequest;

      return () => {
        delete (globalThis as Record<string, unknown>).__mockDappRequest;
      };
    });
  };

/**
 * Initializes mock platform dependencies for mobile platforms.
 *
 * This function provides stub implementations of the dApp connector platform
 * dependencies that allow the module to load without the extension-specific
 * messaging infrastructure.
 *
 * The mock dependencies include:
 * - connectAuthenticator: Creates mock connection requests for testing
 * - dappConnected$: Observable that emits when a dApp connection is granted
 * - dappDisconnected$: Observable that emits when a dApp disconnects
 *
 * @returns Platform dependencies with mock implementations suitable for mobile
 */
export const initializeMobilePlatformDependencies: LaceInitSync<
  DappConnectorPlatformDependencies
> = () => {
  const dappConnected$ = new Subject<DappConnection>();
  const dappDisconnected$ = new Subject<ConnectionContextId>();

  return {
    connectAuthenticator: createMockConnectAuthenticator(
      dappConnected$,
      dappDisconnected$,
    ),
    dappConnected$: dappConnected$.asObservable(),
    dappDisconnected$: dappDisconnected$.asObservable(),
  };
};
