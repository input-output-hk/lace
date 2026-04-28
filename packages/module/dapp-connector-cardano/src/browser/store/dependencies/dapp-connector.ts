import { senderOrigin } from '@lace-sdk/dapp-connector';
import {
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-sdk/extension-messaging';
import { firstValueFrom, Observable, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { APIError, APIErrorCode } from '../../../common/api-error';
import { CardanoDappConnectorApi } from '../../../common/store/dependencies/cardano-dapp-connector-api';
import { createCardanoConfirmationCallback } from '../../../common/store/dependencies/create-confirmation-callback';
import { CIP30_API_METHODS, CIP30_SENDER_CONTEXT_INDEX } from '../../const';
import { CARDANO_WALLET_API_CHANNEL } from '../../messaging';

import type {
  DeriveNextUnusedAddressFunction,
  SignTransactionFunction,
  SubmitTransactionFunction,
} from '../../../common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoConfirmationRequest } from '../../../common/store/dependencies/create-confirmation-callback';
import type { Cip30ApiMethod } from '../../const';
import type { Cip30FullWalletApi, WithSenderContext } from '../../types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoAccountAddressHistoryMap,
} from '@lace-contract/cardano-context';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { SignerFactory } from '@lace-contract/signer';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { RemoteApiProperties } from '@lace-sdk/extension-messaging';
import type { WithLogger } from '@lace-sdk/util';
import type { Subject } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

/**
 * Parameters for connecting the Cardano dApp connector.
 *
 * @template T - The type of actions emitted by the handleRequests function
 */
type ConnectCardanoDappConnectorParameters<T> = {
  /** Observable of authorized dApps for validation */
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>;
  /**
   * Function that handles confirmation requests from the API.
   * Should return an Observable that emits Redux actions.
   */
  handleRequests: (
    request$: Observable<CardanoConfirmationRequest>,
  ) => Observable<T>;
  /** Observable of UTXOs by account */
  accountUtxos$: Observable<AccountUtxoMap>;
  /** Observable of unspendable UTXOs by account */
  accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  /** Observable of reward account details (stake key registration status) by account */
  rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  /** Observable of addresses */
  addresses$: Observable<AnyAddress[]>;
  /** Observable of per-account address transaction history */
  accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  /** Observable of the current chain ID */
  chainId$: Observable<Cardano.ChainId | undefined>;
  /** Observable of all accounts (needed for CIP-95 governance methods) */
  allAccounts$: Observable<AnyAccount[]>;
  /** Observable of all wallets (needed for accessing encrypted root key for signing) */
  allWallets$: Observable<AnyWallet[]>;
  /**
   * Function to get account ID for a specific dApp origin.
   * Enables per-dApp account isolation.
   */
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  /** Function to sign transactions */
  signTransaction?: SignTransactionFunction;
  /** Function to submit transactions */
  submitTransaction: SubmitTransactionFunction;
  /** Derives and persists the next unused External address */
  deriveNextUnusedAddress?: DeriveNextUnusedAddressFunction;
  /** Signer factory for data signing */
  signerFactory?: SignerFactory;
  /** Function to get the auth secret */
  accessAuthSecret?: AccessAuthSecret;
  /** Function to show the auth prompt */
  authenticate?: Authenticate;
  /** Subject to signal signing completion to the popup flow */
  signingResult$?: Subject<{ type: 'cancelled' | 'error' | 'success' }>;
  /** Observable of the app-wide lock state */
  isUnlocked$: Observable<boolean>;
};

/**
 * Checks if the given origin is in the list of authorized dApp origins.
 *
 * @param origin - The origin to check
 * @param cardanoDappsOrigins - List of authorized origins
 * @returns True if the origin is authorized
 */
const isAuthorizedRequest = (
  origin: string | null | undefined,
  cardanoDappsOrigins?: string[],
) => origin && cardanoDappsOrigins?.includes(origin);

const ensureWalletUnlocked = async (isUnlocked$: Observable<boolean>) => {
  const isUnlocked = await firstValueFrom(isUnlocked$);
  if (isUnlocked) return;
  throw new APIError(
    APIErrorCode.Refused,
    'Wallet is locked. Please unlock the wallet first.',
  );
};

/**
 * Validates that a request comes from an authorized dApp.
 *
 * This function is called by exposeApi for each incoming request to ensure
 * that the dApp has been previously authorized via enable().
 *
 * @param sender - The message sender information from the extension
 * @param authorizedDapps$ - Observable of authorized dApps data
 * @param isUnlocked$ - Observable of wallet locked flag
 * @throws APIError with Refused code if the origin is not authorized
 */
export const handleRequestValidation = async (
  sender: Runtime.MessageSender | undefined,
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>,
  isUnlocked$: Observable<boolean>,
): Promise<void> => {
  await ensureWalletUnlocked(isUnlocked$);
  const origin = sender && senderOrigin(sender);

  const authorizedDapps = await firstValueFrom(authorizedDapps$);
  const cardanoDappsOrigins = authorizedDapps.Cardano?.map(
    data => data.dapp.origin,
  );

  if (!isAuthorizedRequest(origin, cardanoDappsOrigins)) {
    throw new APIError(
      APIErrorCode.Refused,
      `Unauthorized request origin: ${origin}. Call cardano.lace.enable() first`,
    );
  }
};

/**
 * Factory function that creates the side effect dependencies for the
 * Cardano dApp connector extension.
 *
 * @param logger - Logger instance for debugging
 * @returns Object containing the connectCardanoDappConnector dependency
 */
export const initializeCardanoDappConnectorDependencies = ({
  logger,
}: WithLogger) => ({
  /**
   * Connects the Cardano dApp connector API to extension messaging.
   *
   * Creates a new CardanoDappConnectorApi instance and exposes it via the
   * extension messaging system. Handles request validation and sender context
   * injection for per-dApp account isolation.
   *
   * @template T - The type of actions emitted by handleRequests
   * @param params - Configuration parameters
   * @returns Observable that emits actions from handleRequests
   */
  connectCardanoDappConnector: <T>({
    authorizedDapps$,
    handleRequests,
    accountUtxos$,
    accountUnspendableUtxos$,
    rewardAccountDetails$,
    addresses$,
    accountTransactionHistory$,
    chainId$,
    allAccounts$,
    allWallets$,
    getAccountIdForOrigin,
    signTransaction,
    submitTransaction,
    deriveNextUnusedAddress,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
    isUnlocked$,
  }: ConnectCardanoDappConnectorParameters<T>): Observable<T> =>
    new Observable(_subscriber => {
      const confirmationCallback = createCardanoConfirmationCallback(
        handleRequests,
        _subscriber,
      );

      const walletApi: WithSenderContext<Cip30FullWalletApi> =
        new CardanoDappConnectorApi({
          accountUtxos$,
          accountUnspendableUtxos$,
          rewardAccountDetails$,
          addresses$,
          accountTransactionHistory$,
          chainId$,
          allAccounts$,
          allWallets$,
          getAccountIdForOrigin,
          userConfirmationRequest: confirmationCallback.callback,
          signTransaction,
          submitTransaction,
          deriveNextUnusedAddress,
          signerFactory,
          accessAuthSecret,
          authenticate,
          signingResult$,
        });

      const api = exposeApi(
        {
          baseChannel: CARDANO_WALLET_API_CHANNEL,
          api$: of(walletApi),
          properties: Object.fromEntries(
            CIP30_API_METHODS.map(methodName => {
              if (methodName === 'getNetworkId') {
                return [
                  methodName,
                  {
                    propType: RemoteApiPropertyType.MethodReturningPromise,
                    requestOptions: {
                      validate: async (_, sender) =>
                        handleRequestValidation(
                          sender,
                          authorizedDapps$,
                          isUnlocked$,
                        ),
                    },
                  },
                ];
              }

              const contextIndex =
                CIP30_SENDER_CONTEXT_INDEX[methodName as Cip30ApiMethod];
              const shouldAddSenderContext = contextIndex !== undefined;

              return [
                methodName,
                {
                  propType: RemoteApiPropertyType.MethodReturningPromise,
                  requestOptions: {
                    validate: async (_, sender) =>
                      handleRequestValidation(
                        sender,
                        authorizedDapps$,
                        isUnlocked$,
                      ),
                    transform: shouldAddSenderContext
                      ? ({ method, args }, sender) => {
                          if (!sender) {
                            throw new APIError(
                              APIErrorCode.InternalError,
                              'Unknown sender',
                            );
                          }
                          const paddedArgs = [...args];
                          while (paddedArgs.length < contextIndex) {
                            paddedArgs.push(undefined);
                          }
                          paddedArgs[contextIndex] = { sender };
                          return {
                            args: paddedArgs,
                            method,
                          };
                        }
                      : undefined,
                  },
                },
              ];
            }),
          ) as RemoteApiProperties<WithSenderContext<Cip30FullWalletApi>>,
        },
        { logger, runtime },
      );

      return () => {
        logger.debug('Shutting down Cardano dApp connector');
        confirmationCallback.shutdown();
        api.shutdown();
      };
    }),
});
