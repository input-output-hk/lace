import { firstValueFrom } from 'rxjs';

import { APIError, APIErrorCode } from '../../common/api-error';
import {
  CardanoDappConnectorApi,
  type CardanoDappConnectorApiDependencies,
  type DeriveNextUnusedAddressFunction,
} from '../../common/store/dependencies/cardano-dapp-connector-api';

import type { Cbor, Paginate, SenderContext } from '../../common/types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';
import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  CardanoAccountAddressHistoryMap,
  CardanoProvider,
} from '@lace-contract/cardano-context';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Represents a CIP-30 request message from a dApp.
 * Contains the method type and arguments to be processed.
 */
export interface Cip30Request {
  /** Unique identifier for this request */
  id: string;
  /** CIP-30 method name (e.g., 'getBalance', 'signTx') */
  type: string;
  /** Arguments for the method call */
  args?: unknown[];
  /** Source identifier for the message */
  source: 'lace-cip30';
}

/**
 * Represents a CIP-30 response to send back to the dApp.
 */
export interface Cip30Response {
  /** Request identifier this response corresponds to */
  id: string;
  /** Whether the request was successful */
  success: boolean;
  /** Result data on success */
  result?: unknown;
  /** Error details on failure */
  error?: { code: number; info: string };
}

/**
 * Indicates that user authorization is required before proceeding.
 * Returned when a dApp calls enable() to connect.
 */
export interface AuthorizationRequired {
  type: 'authorization_required';
  /** Request identifier to correlate with response */
  requestId: string;
  /** Origin URL of the requesting dApp */
  dappOrigin: string;
  /** Human-readable name of the dApp */
  dappName: string;
}

/**
 * Indicates that user signature is required for a signing operation.
 * Returned for signData and signTx requests.
 */
export interface SigningRequired {
  type: 'signing_required';
  /** Request identifier to correlate with response */
  requestId: string;
  /** Origin URL of the requesting dApp */
  dappOrigin: string;
  /** Human-readable name of the dApp */
  dappName: string;
  /** Type of signing operation requested */
  signingType: 'signData' | 'signTx';
  /** For signData - address to sign with */
  address?: string;
  /** For signData - hex payload to sign */
  payload?: string;
  /** For signTx - transaction CBOR */
  txHex?: string;
  /** For signTx - whether partial signing is allowed */
  partialSign?: boolean;
}

/**
 * Indicates that a response is ready to be sent back to the dApp.
 */
export interface ResponseReady {
  type: 'response_ready';
  /** The CIP-30 response to send */
  response: Cip30Response;
}

/**
 * Union type representing all possible results from handling a CIP-30 message.
 */
export type Cip30MessageResult =
  | AuthorizationRequired
  | ResponseReady
  | SigningRequired;

/**
 * Dependencies required by the CIP-30 message handler.
 * Provides access to wallet state and authorization information.
 */
export interface Cip30MessageHandlerDependencies {
  /** Observable of authorized dApps by blockchain */
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>;
  /** Observable of UTXOs indexed by account ID */
  accountUtxos$: Observable<AccountUtxoMap>;
  /** Observable of unspendable UTXOs indexed by account ID */
  accountUnspendableUtxos$: Observable<AccountUtxoMap>;
  /** Observable of reward account details (stake key registration status) indexed by account ID */
  rewardAccountDetails$: Observable<AccountRewardAccountDetailsMap>;
  /** Observable of all addresses across accounts */
  addresses$: Observable<AnyAddress[]>;
  /** Observable of per-account address transaction history */
  accountTransactionHistory$: Observable<CardanoAccountAddressHistoryMap>;
  /** Observable of all accounts */
  allAccounts$: Observable<Array<AnyAccount>>;
  /** Observable of all wallets - needed for accessing encrypted root key for signing */
  allWallets$: Observable<AnyWallet[]>;
  /** Observable of the current chain ID */
  chainId$: Observable<Cardano.ChainId | undefined>;
  /**
   * Function to get account ID for a specific dApp origin.
   * Enables per-dApp account isolation.
   * @param origin - The dApp origin URL
   * @returns The account ID associated with this origin, or undefined if not found
   */
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  /**
   * Function to check if a dApp is session-authorized.
   * @param origin - The dApp origin URL
   * @returns True if the dApp has a valid session authorization
   */
  isSessionAuthorized: (origin: string) => boolean;
  /** Cardano provider instance for submitting transactions */
  cardanoProvider: CardanoProvider;
  /** Derives and persists the next unused External address */
  deriveNextUnusedAddress?: DeriveNextUnusedAddressFunction;
}

/**
 * Handle a CIP-30 message from a WebView context.
 *
 * This is the core message handling logic that:
 * 1. Checks authorization for the dApp
 * 2. Delegates to CardanoDappConnectorApi for actual CIP-30 method implementations
 * 3. Returns either a response or an authorization_required/signing_required indicator
 *
 * @param message - The CIP-30 request message to handle
 * @param dappOrigin - The origin URL of the requesting dApp
 * @param deps - Dependencies for authorization checking and API access
 * @returns Either a response to send back, or an indication that authorization/signing is required
 * @throws Never throws - all errors are converted to error responses
 */
export const handleCip30Message = async (
  message: Cip30Request,
  dappOrigin: string,
  deps: Cip30MessageHandlerDependencies,
): Promise<Cip30MessageResult> => {
  const { id, type, args = [] } = message;

  const apiDeps: CardanoDappConnectorApiDependencies = {
    accountUtxos$: deps.accountUtxos$,
    accountUnspendableUtxos$: deps.accountUnspendableUtxos$,
    addresses$: deps.addresses$,
    accountTransactionHistory$: deps.accountTransactionHistory$,
    chainId$: deps.chainId$,
    rewardAccountDetails$: deps.rewardAccountDetails$,
    getAccountIdForOrigin: deps.getAccountIdForOrigin,
    allAccounts$: deps.allAccounts$,
    allWallets$: deps.allWallets$,
    deriveNextUnusedAddress: deps.deriveNextUnusedAddress,
    submitTransaction: async cbor => {
      const chainId = await firstValueFrom(deps.chainId$);
      if (!chainId) {
        throw new APIError(
          APIErrorCode.InternalError,
          'Cannot submit transaction: chain ID is undefined',
        );
      }
      const result = await firstValueFrom(
        deps.cardanoProvider.submitTx({ signedTransaction: cbor }, { chainId }),
      );
      if (result.isErr()) throw result.error;
      return result.value;
    },
  };
  const walletApi = new CardanoDappConnectorApi(apiDeps);

  const senderContext: SenderContext = {
    sender: { url: dappOrigin } as SenderContext['sender'],
  };

  const isDappAuthorized = async (origin: string): Promise<boolean> => {
    if (deps.isSessionAuthorized(origin)) {
      return true;
    }

    const authorizedDapps = await firstValueFrom(deps.authorizedDapps$);
    const cardanoDapps = authorizedDapps.Cardano ?? [];
    return cardanoDapps.some(d => d.dapp.origin === origin);
  };

  const createResponse = (response: Cip30Response): ResponseReady => ({
    type: 'response_ready',
    response,
  });

  const createErrorResponse = (code: number, info: string): ResponseReady =>
    createResponse({
      id,
      success: false,
      error: { code, info },
    });

  const getDappName = (origin: string): string => {
    try {
      return new URL(origin).hostname || origin;
    } catch {
      return origin || 'Unknown DApp';
    }
  };

  try {
    if (type === 'isEnabled') {
      // Session authorization means the origin→account mapping is set up and ready.
      const isSessionReady = deps.isSessionAuthorized(dappOrigin);
      return createResponse({ id, success: true, result: isSessionReady });
    }

    if (type === 'enable') {
      // Skip the auth sheet if the session is already established.
      if (deps.isSessionAuthorized(dappOrigin)) {
        return createResponse({ id, success: true, result: true });
      }

      return {
        type: 'authorization_required',
        requestId: id,
        dappOrigin,
        dappName: getDappName(dappOrigin),
      };
    }

    const isAuthorizationRequired = type !== 'getNetworkId';
    if (isAuthorizationRequired && !(await isDappAuthorized(dappOrigin))) {
      return createErrorResponse(
        APIErrorCode.Refused,
        'Not authorized. Call cardano.lace.enable() first.',
      );
    }

    const handlers: Record<string, () => Promise<unknown>> = {
      getNetworkId: async () => walletApi.getNetworkId(),
      getUtxos: async () => {
        const [amount, paginate] = args as [
          Cbor | undefined,
          Paginate | undefined,
        ];
        return walletApi.getUtxos(amount, paginate, senderContext);
      },
      getCollateral: async () => {
        const [params] = args as [{ amount?: Cbor } | undefined];
        return walletApi.getCollateral(params, senderContext);
      },
      getBalance: async () => walletApi.getBalance(senderContext),
      getUsedAddresses: async () => {
        const [paginate] = args as [Paginate | undefined];
        return walletApi.getUsedAddresses(paginate, senderContext);
      },
      getUnusedAddresses: async () =>
        walletApi.getUnusedAddresses(senderContext),
      getChangeAddress: async () => walletApi.getChangeAddress(senderContext),
      getRewardAddresses: async () =>
        walletApi.getRewardAddresses(senderContext),
      getExtensions: async () => walletApi.getExtensions(),

      getPubDRepKey: async () => walletApi.getPubDRepKey(senderContext),
      getRegisteredPubStakeKeys: async () =>
        walletApi.getRegisteredPubStakeKeys(senderContext),
      getUnregisteredPubStakeKeys: async () =>
        walletApi.getUnregisteredPubStakeKeys(senderContext),

      getNetworkMagic: async () => walletApi.getNetworkMagic(),

      signData: async () => {
        const [address, payload] = args as [string, string];
        return {
          type: 'signing_required' as const,
          requestId: id,
          dappOrigin,
          dappName: getDappName(dappOrigin),
          signingType: 'signData' as const,
          address,
          payload,
        };
      },

      signTx: async () => {
        const [txHex, isPartialSign] = args as [string, boolean | undefined];
        return {
          type: 'signing_required' as const,
          requestId: id,
          dappOrigin,
          dappName: getDappName(dappOrigin),
          signingType: 'signTx' as const,
          txHex,
          partialSign: isPartialSign ?? false,
        };
      },

      submitTx: async () => {
        const [txCbor] = args as [string];
        return walletApi.submitTx(txCbor);
      },
    };

    const handler = handlers[type];
    if (!handler) {
      throw new APIError(APIErrorCode.InternalError, `Unknown method: ${type}`);
    }

    const result = await handler();

    if (
      typeof result === 'object' &&
      result !== null &&
      'type' in result &&
      result.type === 'signing_required'
    ) {
      return result as SigningRequired;
    }

    return createResponse({ id, success: true, result });
  } catch (error) {
    if (error instanceof APIError) {
      return createErrorResponse(error.code, error.info);
    }

    const error_ = error as Error;
    return createErrorResponse(APIErrorCode.InternalError, error_.message);
  }
};
