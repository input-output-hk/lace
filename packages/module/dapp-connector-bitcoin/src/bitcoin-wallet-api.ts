import { AuthenticatorErrorCode } from '@lace-contract/dapp-connector';

import { BitcoinAPIError, BitcoinAPIErrorCode } from './api-error';
import { FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR } from './const';

import type { BitcoinWalletApi } from './types';
import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-lib/dapp-connector';
import type { Logger } from 'ts-log';

/**
 * Version string reported by the object injected at window.bitcoin.lace.
 */
export type ApiVersion = string;

export type WalletName = string;

export type WalletIcon = string;

/**
 * Configuration for the object injected at window.bitcoin.lace.
 */
export type WalletProperties = {
  icon?: WalletIcon;
  name: WalletName;
};

/**
 * Collaborators the injected wallet object needs to authorize a dApp and
 * reach the wallet API exposed by the service worker.
 */
export type WalletDependencies = {
  api: BitcoinWalletApi;
  authenticator: RemoteAuthenticator;
  featureFlagProbe: FeatureFlagProbe;
  logger: Logger;
};

/**
 * The object injected at window.bitcoin.lace. Gates the Unisat/OKX de facto
 * wallet API surface behind enable(), so a dApp only reaches getAccounts,
 * getNetwork, getBalance, getUtxos, signMessage, signPsbt, sendBitcoin and
 * pushTx once its origin has been authorized.
 */
export class BitcoinDappWalletApi {
  public readonly apiVersion: ApiVersion = '1.0.0';
  public readonly name: WalletName;
  public readonly icon: WalletIcon;

  readonly #logger: Logger;
  readonly #authenticator: RemoteAuthenticator;
  readonly #api: BitcoinWalletApi;
  readonly #featureFlagProbe: FeatureFlagProbe;

  public constructor(
    properties: WalletProperties,
    dependencies: WalletDependencies,
  ) {
    this.icon = properties.icon || '';
    this.name = properties.name;
    this.#logger = dependencies.logger;
    this.#authenticator = dependencies.authenticator;
    this.#api = dependencies.api;
    this.#featureFlagProbe = dependencies.featureFlagProbe;
  }

  /**
   * Authorizes the calling dApp origin and returns the wallet API surface.
   * Always re-requests access so authorization is re-evaluated on every
   * call, letting a returning dApp pick a different account and
   * re-establishing the binding after a service worker restart.
   *
   * Checks the feature flag before touching the authenticator channel:
   * calling a SW-side channel while the SW module isn't loaded would hang
   * indefinitely, since nothing on the other end would answer.
   */
  public async enable(): Promise<BitcoinWalletApi> {
    const featureFlags = await this.#featureFlagProbe.getFeatureFlags();
    const isBitcoinDappConnectorEnabled = featureFlags.some(
      flag => flag.key === FEATURE_FLAG_BITCOIN_DAPP_CONNECTOR,
    );

    if (!isBitcoinDappConnectorEnabled) {
      throw new BitcoinAPIError(
        BitcoinAPIErrorCode.InternalError,
        'Bitcoin wallet API is not available. The DApp connector functionality may be disabled.',
      );
    }

    try {
      if (!(await this.#authenticator.requestAccess())) {
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.Refused,
          'Access to wallet API denied',
        );
      }
      this.#logger.debug(
        `${location.origin} has been granted access to Bitcoin wallet API`,
      );
    } catch (error: unknown) {
      if (error instanceof BitcoinAPIError) throw error;
      const authenticatorError = error as
        | { name?: string; code?: string }
        | undefined;
      if (
        authenticatorError?.name === 'AuthenticatorError' &&
        authenticatorError?.code === AuthenticatorErrorCode.NoWalletAvailable
      ) {
        throw new BitcoinAPIError(
          BitcoinAPIErrorCode.InternalError,
          'No Bitcoin wallet available. Please create or restore a wallet first.',
        );
      }
      throw error;
    }

    return {
      getAccounts: this.#api.getAccounts,
      getNetwork: this.#api.getNetwork,
      getBalance: this.#api.getBalance,
      getUtxos: this.#api.getUtxos,
      signMessage: this.#api.signMessage,
      signPsbt: this.#api.signPsbt,
      sendBitcoin: this.#api.sendBitcoin,
      pushTx: this.#api.pushTx,
    };
  }
}
