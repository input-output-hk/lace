import { AuthenticatorErrorCode } from '@lace-contract/dapp-connector';
import { RemoteApiShutdownError } from '@lace-lib/extension-messaging';

import { APIError, APIErrorCode } from '../common/api-error';
import { supportedCip30Extensions } from '../common/cip30-extensions';
import {
  CIP30_API_VERSION,
  FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
  WALLET_NAME,
  WALLET_ICON,
} from '../common/const';

import type { Cip30FullWalletApi } from './types';
import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-lib/dapp-connector';
import type { Logger } from 'ts-log';

/**
 * CIP-30 API version string.
 * @see https://cips.cardano.org/cip/CIP-30
 */
export type ApiVersion = string;

/**
 * Wallet display name.
 */
export type WalletName = string;

/**
 * Wallet icon - typically a data URL or URL to an image.
 */
export type WalletIcon = string;

/**
 * CIP-30 extension identifier.
 * Extensions allow dApps to request additional functionality.
 */
export interface Cip30Extension {
  /** CIP number identifying the extension */
  cip: number;
}

/**
 * Configuration properties for the wallet.
 */
export interface WalletProperties {
  /** Optional wallet icon (data URL or URL) */
  icon?: WalletIcon;
  /** Wallet display name */
  name: WalletName;
}

/**
 * Dependencies required by the wallet API.
 */
export interface WalletDependencies {
  /** Remote wallet API for CIP-30 methods */
  api: Cip30FullWalletApi;
  /** Remote authenticator for authorization */
  authenticator: RemoteAuthenticator;
  /** Probe to check if Cardano dapp connector FF is enabled */
  featureFlagProbe: FeatureFlagProbe;
  /** Logger instance */
  logger: Logger;
}

/**
 * The enabled API object returned by enable().
 * Contains all CIP-30 wallet methods including signing.
 */
export type EnabledApi = Cip30FullWalletApi;

export interface CardanoWalletApiObject {
  readonly apiVersion: ApiVersion;
  readonly name: WalletName;
  readonly icon: WalletIcon;
  readonly supportedExtensions: readonly Cip30Extension[];
  isEnabled(): Promise<boolean>;
  enable(_extensions?: Cip30Extension[]): Promise<EnabledApi>;
}

// For calls that may have changed wallet state. Reports the outcome as UNKNOWN
// and does not advise a retry: the page cannot tell whether the wallet went on
// to sign or submit, so inviting a retry risks a double submission, and
// claiming nothing happened may be false.
const CONNECTION_CLOSED_INFO =
  'The wallet connection closed before the request completed. Whether the ' +
  'wallet completed it is unknown.';

// For read-only calls, which cannot have changed anything, so a retry is safe
// and saying so is strictly more useful than the unknown-outcome wording.
const CONNECTION_CLOSED_READ_INFO =
  'The wallet connection closed before the request completed. Nothing was ' +
  'changed, so the request can be retried.';

// A pending call rejects with RemoteApiShutdownError when the injected port
// disconnects — e.g. the page was frozen into the back/forward cache. Surface
// that to the dApp as a CIP-30 APIError, not the internal transport error.
// InternalError (-2), never Refused (-3): the user did not decline, and dApps
// branch on Refused to stop retrying.
//
// Applied to EVERY method, not just the signing ones. The read methods are the
// ones configured to replay across a disconnect, so they are the calls a freeze
// most reliably lands on — and when a replay ultimately fails they were leaking
// the raw transport type, which is exactly what this is meant to prevent.
const mapConnectionClosed =
  <Args extends unknown[], Result>(
    operation: (...args: Args) => Promise<Result>,
    info: string = CONNECTION_CLOSED_INFO,
  ) =>
  async (...args: Args): Promise<Result> => {
    try {
      return await operation(...args);
    } catch (error) {
      if (error instanceof RemoteApiShutdownError) {
        throw new APIError(APIErrorCode.InternalError, info);
      }
      throw error;
    }
  };

/** Wraps a read-only CIP-30 method with the retry-safe connection-closed error. */
const mapReadConnectionClosed = <Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
) => mapConnectionClosed(operation, CONNECTION_CLOSED_READ_INFO);

/**
 * Creates an object that implements CIP-30 wallet API for Cardano dApps.
 * @see https://cips.cardano.org/cip/CIP-30
 * ```
 */
export const createCardanoWalletApi = (
  properties: WalletProperties,
  dependencies: WalletDependencies,
): CardanoWalletApiObject => {
  /**
   * CIP-30 API version.
   * Currently set to '1.0.0' as per CIP-30 specification.
   */
  const apiVersion: ApiVersion = CIP30_API_VERSION;

  /**
   * Wallet display name shown to users.
   */
  const name: WalletName = properties.name || WALLET_NAME;

  /**
   * Wallet icon for display in dApp UIs.
   * Typically a data URL or URL to an image.
   */
  const icon: WalletIcon = properties.icon || WALLET_ICON;

  /**
   * List of supported CIP extensions, derived from the single-source
   * registry so this can never disagree with getExtensions().
   */
  const supportedExtensions: readonly Cip30Extension[] =
    supportedCip30Extensions();

  const logger = dependencies.logger;
  const authenticator = dependencies.authenticator;
  const api = dependencies.api;
  const featureFlagProbe = dependencies.featureFlagProbe;

  let isSessionAuthorized = false;
  let pendingEnable: Promise<EnabledApi> | null = null;
  let cachedEnabledApi: EnabledApi | undefined;

  const buildEnabledApi = (): EnabledApi => {
    const flatApi = api as Cip30FullWalletApi & {
      getPubDRepKey?: Cip30FullWalletApi['cip95']['getPubDRepKey'];
      getRegisteredPubStakeKeys?: Cip30FullWalletApi['cip95']['getRegisteredPubStakeKeys'];
      getUnregisteredPubStakeKeys?: Cip30FullWalletApi['cip95']['getUnregisteredPubStakeKeys'];
      getNetworkMagic?: Cip30FullWalletApi['cip142']['getNetworkMagic'];
    };

    return {
      getNetworkId: mapReadConnectionClosed(api.getNetworkId.bind(api)),
      getUtxos: mapReadConnectionClosed(api.getUtxos.bind(api)),
      getCollateral: mapReadConnectionClosed(api.getCollateral.bind(api)),
      getBalance: mapReadConnectionClosed(api.getBalance.bind(api)),
      getUsedAddresses: mapReadConnectionClosed(api.getUsedAddresses.bind(api)),
      getUnusedAddresses: mapReadConnectionClosed(
        api.getUnusedAddresses.bind(api),
      ),
      getChangeAddress: mapReadConnectionClosed(api.getChangeAddress.bind(api)),
      getRewardAddresses: mapReadConnectionClosed(
        api.getRewardAddresses.bind(api),
      ),
      getExtensions: mapReadConnectionClosed(api.getExtensions.bind(api)),
      signTx: mapConnectionClosed(api.signTx.bind(api)),
      signData: mapConnectionClosed(api.signData.bind(api)),
      submitTx: mapConnectionClosed(api.submitTx.bind(api)),
      cip95: {
        getPubDRepKey: mapReadConnectionClosed(
          (api.cip95?.getPubDRepKey ?? flatApi.getPubDRepKey!).bind(
            api.cip95 ?? api,
          ),
        ),
        getRegisteredPubStakeKeys: mapReadConnectionClosed(
          (
            api.cip95?.getRegisteredPubStakeKeys ??
            flatApi.getRegisteredPubStakeKeys!
          ).bind(api.cip95 ?? api),
        ),
        getUnregisteredPubStakeKeys: mapReadConnectionClosed(
          (
            api.cip95?.getUnregisteredPubStakeKeys ??
            flatApi.getUnregisteredPubStakeKeys!
          ).bind(api.cip95 ?? api),
        ),
        // CIP-95 signData is the same extended implementation as the flat
        // method; namespaced so cip95-first dApps find it. Wrapped like the
        // flat one — governance dApps call this binding, not the flat method.
        signData: mapConnectionClosed(api.signData.bind(api)),
      },
      cip142: {
        getNetworkMagic: mapReadConnectionClosed(
          (api.cip142?.getNetworkMagic ?? flatApi.getNetworkMagic!).bind(
            api.cip142 ?? api,
          ),
        ),
      },
      experimental: {
        getCollateral: mapReadConnectionClosed(api.getCollateral.bind(api)),
      },
    };
  };

  /**
   * Checks if the dApp is already authorized to access the wallet.
   *
   * This method does not trigger a popup or user interaction.
   * It simply checks if the dApp has previously been granted access.
   *
   * @returns Promise resolving to true if authorized, false otherwise
   */
  const isEnabled = async (): Promise<boolean> => isSessionAuthorized;

  /**
   * Requests authorization to access the wallet and returns the enabled API.
   *
   * Always round-trips to the SW so authorization is re-evaluated on each
   * call. Concurrent calls are deduplicated via `pendingEnable`.
   *
   * @param _extensions - Optional CIP extensions to enable. Accepted per
   *   CIP-30 but not used to gate the API: every registered extension is
   *   always enabled (the spec permits enabling more than requested), so
   *   feature detection stays honest for dApps that skip the request.
   * @returns Promise resolving to the enabled wallet API object
   * @throws APIError with Refused code if user denies access
   */
  const enable = async (
    _extensions?: Cip30Extension[],
  ): Promise<EnabledApi> => {
    // Check if the Cardano dapp connector FF is enabled on the SW
    // before calling authenticator.requestAccess(), which would hang indefinitely
    // if the SW-side module isn't loaded (no listener on the other end).
    const featureFlags = await featureFlagProbe.getFeatureFlags();
    const isCardanoDappConnectorEnabled = featureFlags.some(
      flag => flag.key === FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
    );

    if (!isCardanoDappConnectorEnabled) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Cardano wallet API is not available. The DApp connector functionality may be disabled.',
      );
    }

    // Concurrent enable() calls — deduplicate by returning the pending request
    if (pendingEnable) {
      return pendingEnable;
    }

    pendingEnable = (async () => {
      try {
        if (await authenticator.requestAccess()) {
          isSessionAuthorized = true;
          logger.debug(
            `${location.origin} has been granted access to Cardano wallet API`,
          );
          const enabledApi = (cachedEnabledApi ??= buildEnabledApi());
          return enabledApi;
        }
      } catch (error: unknown) {
        const authenticatorError = error as
          | { name?: string; code?: string }
          | undefined;
        if (
          authenticatorError?.name === 'AuthenticatorError' &&
          authenticatorError?.code === AuthenticatorErrorCode.NoWalletAvailable
        ) {
          throw new APIError(
            APIErrorCode.InternalError,
            'No Cardano wallet available. Please create or restore a wallet first.',
          );
        }
        throw error;
      } finally {
        pendingEnable = null;
      }

      throw new APIError(APIErrorCode.Refused, 'Access to wallet API denied');
    })();

    return pendingEnable;
  };

  return Object.freeze({
    apiVersion,
    name,
    icon,
    supportedExtensions,
    isEnabled,
    enable: mapConnectionClosed(enable),
  });
};
