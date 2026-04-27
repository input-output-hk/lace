import { AuthenticatorErrorCode } from '@lace-contract/dapp-connector';
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api';

import { APIError } from './api-error';
import { FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR } from './const';
import { type ExtendedDAppConnectorWalletAPI } from './types';

import type { FeatureFlagProbe } from '@lace-contract/dapp-connector';
import type { RemoteAuthenticator } from '@lace-sdk/dapp-connector';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { Logger } from 'ts-log';

export type ApiVersion = string;

export type WalletName = string;

export type WalletIcon = string;

export type WalletProperties = {
  icon?: WalletIcon;
  name: WalletName;
};

export type WalletDependencies = {
  api: ExtendedDAppConnectorWalletAPI;
  authenticator: RemoteAuthenticator;
  featureFlagProbe: FeatureFlagProbe;
  logger: Logger;
};

export class MidnightWalletApi {
  public readonly apiVersion: ApiVersion = '4.0.1';
  public readonly name: WalletName;
  public readonly icon: WalletIcon;

  readonly #logger: Logger;
  readonly #authenticator: RemoteAuthenticator;
  readonly #api: ExtendedDAppConnectorWalletAPI;
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

  public async connect(networkId: string): Promise<ConnectedAPI> {
    // Check if the Midnight dapp connector FF is enabled on the SW
    // before calling any SW-side channel (checkNetworkSupport, authenticator),
    // which would hang indefinitely if the SW-side module isn't loaded.
    const featureFlags = await this.#featureFlagProbe.getFeatureFlags();
    const isMidnightDappConnectorEnabled = featureFlags.some(
      flag => flag.key === FEATURE_FLAG_MIDNIGHT_DAPP_CONNECTOR,
    );

    if (!isMidnightDappConnectorEnabled) {
      throw new APIError(
        ErrorCodes.InternalError,
        'Midnight wallet API is not available. The DApp connector functionality may be disabled.',
      );
    }

    // Authenticate before checkNetworkSupport: if the user has no Midnight
    // wallet, the authenticator rejects with NoWalletAvailable immediately.
    // checkNetworkSupport would fail with a misleading network-mismatch error
    // because there is no wallet to check the network against.
    try {
      if (!(await this.#authenticator.haveAccess())) {
        if (!(await this.#authenticator.requestAccess())) {
          throw new APIError(
            ErrorCodes.Rejected,
            'Access to wallet api denied',
          );
        }
        this.#logger.debug(
          `${location.origin} has been granted access to wallet api`,
        );
      }
    } catch (error: unknown) {
      if (error instanceof APIError) throw error;
      const authenticatorError = error as
        | { name?: string; code?: string }
        | undefined;
      if (
        authenticatorError?.name === 'AuthenticatorError' &&
        authenticatorError?.code === AuthenticatorErrorCode.NoWalletAvailable
      ) {
        throw new APIError(
          ErrorCodes.InternalError,
          'No Midnight wallet available. Please create or restore a wallet first.',
        );
      }
      throw error;
    }

    await this.#api.checkNetworkSupport(networkId);

    if (await this.#api.isLocked()) {
      const isGranted = await this.#authenticator.requestAccess({
        forceReauth: true,
      });
      if (!isGranted) {
        throw new APIError(ErrorCodes.Rejected, 'Access to wallet api denied');
      }
    }

    return {
      getUnshieldedBalances: this.#api.getUnshieldedBalances,
      getShieldedBalances: this.#api.getShieldedBalances,
      getDustBalance: this.#api.getDustBalance,
      getShieldedAddresses: this.#api.getShieldedAddresses,
      getUnshieldedAddress: this.#api.getUnshieldedAddress,
      getDustAddress: this.#api.getDustAddress,
      getProvingProvider: this.#api.getProvingProvider,
      getTxHistory: this.#api.getTxHistory,
      balanceUnsealedTransaction: this.#api.balanceUnsealedTransaction,
      balanceSealedTransaction: this.#api.balanceSealedTransaction,
      makeTransfer: this.#api.makeTransfer,
      makeIntent: this.#api.makeIntent,
      signData: this.#api.signData,
      submitTransaction: this.#api.submitTransaction,
      getConfiguration: this.#api.getConfiguration,
      getConnectionStatus: this.#api.getConnectionStatus,
      hintUsage: this.#api.hintUsage,
    };
  }
}
