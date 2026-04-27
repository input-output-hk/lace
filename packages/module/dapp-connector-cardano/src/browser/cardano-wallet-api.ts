import { AuthenticatorErrorCode } from '@lace-contract/dapp-connector';

import { APIError, APIErrorCode } from '../common/api-error';
import {
  CIP30_API_VERSION,
  FEATURE_FLAG_CARDANO_DAPP_CONNECTOR,
  WALLET_NAME,
  WALLET_ICON,
} from '../common/const';

import type { Cip30FullWalletApi } from './types';
import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';
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
   * List of supported CIP extensions.
   * Declares support for CIP-95 (Governance) and CIP-142 (Network Magic).
   */
  const supportedExtensions: readonly Cip30Extension[] = [
    { cip: 95 },
    { cip: 142 },
  ];

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
      getNetworkId: api.getNetworkId.bind(api),
      getUtxos: api.getUtxos.bind(api),
      getCollateral: api.getCollateral.bind(api),
      getBalance: api.getBalance.bind(api),
      getUsedAddresses: api.getUsedAddresses.bind(api),
      getUnusedAddresses: api.getUnusedAddresses.bind(api),
      getChangeAddress: api.getChangeAddress.bind(api),
      getRewardAddresses: api.getRewardAddresses.bind(api),
      getExtensions: api.getExtensions.bind(api),
      signTx: api.signTx.bind(api),
      signData: api.signData.bind(api),
      submitTx: api.submitTx.bind(api),
      cip95: {
        getPubDRepKey: (
          api.cip95?.getPubDRepKey ?? flatApi.getPubDRepKey!
        ).bind(api.cip95 ?? api),
        getRegisteredPubStakeKeys: (
          api.cip95?.getRegisteredPubStakeKeys ??
          flatApi.getRegisteredPubStakeKeys!
        ).bind(api.cip95 ?? api),
        getUnregisteredPubStakeKeys: (
          api.cip95?.getUnregisteredPubStakeKeys ??
          flatApi.getUnregisteredPubStakeKeys!
        ).bind(api.cip95 ?? api),
      },
      cip142: {
        getNetworkMagic: (
          api.cip142?.getNetworkMagic ?? flatApi.getNetworkMagic!
        ).bind(api.cip142 ?? api),
      },
      experimental: {
        getCollateral: api.getCollateral.bind(api),
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
   * If the dApp is already authorized (via previous enable() call), this
   * returns immediately without user interaction. Otherwise, it triggers
   * the authorization popup. Concurrent calls are deduplicated.
   *
   * @param _extensions - Optional list of CIP extensions to enable (not yet implemented)
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

    // Already authorized in this session — return immediately
    if (isSessionAuthorized) {
      cachedEnabledApi ??= buildEnabledApi();
      return cachedEnabledApi;
    }

    // Concurrent enable() calls — deduplicate by returning the pending request
    if (pendingEnable) {
      return pendingEnable;
    }

    pendingEnable = (async () => {
      try {
        if (await authenticator.requestAccess({ forceReauth: true })) {
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
    enable,
  });
};
