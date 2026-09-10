import { senderOrigin } from '@lace-lib/dapp-connector';
import {
  exposeApi,
  RemoteApiPropertyType,
} from '@lace-lib/extension-messaging';
import { firstValueFrom, Observable, of } from 'rxjs';
import { runtime } from 'webextension-polyfill';

import { BitcoinAPIError, BitcoinAPIErrorCode } from '../../api-error';
import { WalletApiMethodNames } from '../../const';
import { BITCOIN_WALLET_API_CHANNEL } from '../../messaging';

import { BitcoinDappConnectorApi } from './bitcoin-dapp-connector-api';
import { createBitcoinConfirmationCallback } from './create-confirmation-callback';

import type {
  BitcoinAccountUtxoMap,
  BitcoinDappConnectorProvider,
  BuildSendTxFunction,
  ConfirmSendTxFunction,
  SubmitRawTxFunction,
  SignBitcoinMessageFunction,
  SignBitcoinPsbtFunction,
} from './bitcoin-dapp-connector-api';
import type { BitcoinConfirmationRequest } from './create-confirmation-callback';
import type { BitcoinWalletApi, WithSenderContext } from '../../types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { RemoteApiProperties } from '@lace-lib/extension-messaging';
import type { WithLogger } from '@lace-lib/util';
import type { Runtime } from 'webextension-polyfill';

type ConnectBitcoinDappConnectorParams<T> = {
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>;
  isUnlocked$: Observable<boolean>;
  handleRequests: (
    request$: Observable<BitcoinConfirmationRequest>,
  ) => Observable<T>;
  addresses$: Observable<AnyAddress[]>;
  accountUtxos$: Observable<BitcoinAccountUtxoMap>;
  accountTokens$: Observable<
    Record<string, { fungible: Token[]; nfts: Token[] }>
  >;
  activeNetworkId$: Observable<BlockchainNetworkId | undefined>;
  bitcoinProvider: BitcoinDappConnectorProvider;
  getAccountIdForOrigin: (origin: string) => AccountId | undefined;
  signMessage: SignBitcoinMessageFunction;
  signPsbt: SignBitcoinPsbtFunction;
  buildSendTx: BuildSendTxFunction;
  confirmSendTx: ConfirmSendTxFunction;
  submitRawTx: SubmitRawTxFunction;
};

const ensureWalletUnlocked = async (isUnlocked$: Observable<boolean>) => {
  const isUnlocked = await firstValueFrom(isUnlocked$);
  if (isUnlocked) return;
  throw new BitcoinAPIError(
    BitcoinAPIErrorCode.Refused,
    'Wallet is locked. Please unlock the wallet first.',
  );
};

const isAuthorizedRequest = (
  origin: string | null | undefined,
  bitcoinDappOrigins?: string[],
) => origin && bitcoinDappOrigins?.includes(origin);

/**
 * Number of arguments each wallet API method accepts from a dApp. The
 * transform truncates incoming arguments to this arity before appending the
 * trusted sender context, so a dApp passing extra trailing arguments cannot
 * shift a forged context into the position the API reads it from.
 */
const WalletApiMethodArity: Record<keyof BitcoinWalletApi, number> = {
  getAccounts: 0,
  getNetwork: 0,
  getBalance: 0,
  getUtxos: 0,
  signMessage: 2,
  signPsbt: 2,
  sendBitcoin: 3,
  pushTx: 1,
};

/**
 * Validates a wallet API request: the wallet must be unlocked and the sender
 * origin must be an authorized Bitcoin dApp.
 */
export const handleRequestValidation = async (
  sender: Runtime.MessageSender | undefined,
  authorizedDapps$: Observable<AuthorizedDappsDataSlice>,
  isUnlocked$: Observable<boolean>,
) => {
  await ensureWalletUnlocked(isUnlocked$);
  const origin = sender && senderOrigin(sender);

  const authorizedDapps = await firstValueFrom(authorizedDapps$);
  const bitcoinDappOrigins = authorizedDapps.Bitcoin?.map(
    data => data.dapp.origin,
  );

  if (!isAuthorizedRequest(origin, bitcoinDappOrigins)) {
    throw new BitcoinAPIError(
      BitcoinAPIErrorCode.Refused,
      `Unauthorized request origin: ${origin}. Call bitcoin.lace.enable() first`,
    );
  }
};

/**
 * Creates the side-effect dependency that exposes the Bitcoin wallet API over
 * extension messaging. getNetwork only requires an unlocked wallet; every
 * other method additionally requires an authorized origin and receives the
 * messaging sender appended to its arguments after they are truncated to the
 * method's dApp-facing arity.
 */
export const initializeBitcoinDappConnectorSideEffectDependencies = ({
  logger,
}: WithLogger) => ({
  connectBitcoinDappConnector: <T>({
    authorizedDapps$,
    isUnlocked$,
    handleRequests,
    ...apiDependencies
  }: ConnectBitcoinDappConnectorParams<T>): Observable<T> =>
    new Observable(subscriber => {
      const confirmation = createBitcoinConfirmationCallback(
        handleRequests,
        subscriber,
      );
      const walletApi: WithSenderContext<BitcoinWalletApi> =
        new BitcoinDappConnectorApi({
          ...apiDependencies,
          userConfirmationRequest: confirmation.callback,
        });

      const api = exposeApi(
        {
          baseChannel: BITCOIN_WALLET_API_CHANNEL,
          api$: of(walletApi),
          properties: Object.fromEntries(
            WalletApiMethodNames.map(methodName => [
              methodName,
              {
                propType: RemoteApiPropertyType.MethodReturningPromise,
                requestOptions:
                  'getNetwork' === methodName
                    ? {
                        validate: async () => {
                          await ensureWalletUnlocked(isUnlocked$);
                        },
                      }
                    : {
                        validate: async (_, sender) =>
                          handleRequestValidation(
                            sender,
                            authorizedDapps$,
                            isUnlocked$,
                          ),
                        transform: ({ method, args }, sender) => {
                          if (!sender)
                            throw new BitcoinAPIError(
                              BitcoinAPIErrorCode.InternalError,
                              'Unknown sender',
                            );
                          return {
                            args: [
                              ...args.slice(
                                0,
                                WalletApiMethodArity[methodName],
                              ),
                              { sender },
                            ],
                            method,
                          };
                        },
                      },
              },
            ]),
          ) as RemoteApiProperties<WithSenderContext<BitcoinWalletApi>>,
        },
        { logger, runtime },
      );

      return () => {
        logger.debug('Shutting down bitcoin dapp connector');
        api.shutdown();
        confirmation.shutdown();
      };
    }),
});
