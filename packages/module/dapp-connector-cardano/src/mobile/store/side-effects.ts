import { Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { blake2b } from '@cardano-sdk/crypto';
import { Bip32Account, KeyRole } from '@cardano-sdk/key-management';
import {
  cardanoAccountUtxos$,
  cardanoAccountUnspendableUtxos$,
  cardanoAddresses$,
  cardanoChainId$,
  isCardanoAccount,
  cardanoRewardAccountDetails$,
} from '@lace-contract/cardano-context';
import { DappId } from '@lace-contract/dapp-connector';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import { WalletType } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { HexBytes } from '@lace-sdk/util';
import {
  catchError,
  filter,
  from,
  map,
  merge,
  mergeMap,
  of,
  Subject,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs';

import { APIErrorCode, TxSignErrorCode } from '../../common/api-error';
import { createDeriveNextAddress } from '../../common/store/derive-next-address';
import { createResolveForeignInputsFlow } from '../../common/store/resolve-foreign-inputs';
import {
  addrToSignWith,
  transformToGroupedAddresses,
} from '../../common/store/util';
import { requiresForeignSignaturesFromCbor } from '../../common/store/utils/input-resolver';
import { handleCip30Message } from '../services/cip30-message-handler';

import type { DappInfo, WebViewResponse } from '../../common/store/slice';
import type { SideEffect } from '../../index';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { UpsertAddressesPayload } from '@lace-contract/addresses';
import type {
  CardanoSignerContext,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { AvatarContent } from '@lace-lib/ui-toolkit';

/**
 * Derives dApp status for the AuthorizeDapp status tag from the request origin.
 * - unsecured: origin is not https (e.g. http or invalid)
 * - trusted: origin is https (show "Only connect to trusted DApps" reminder)
 * - blocked: would require a blocklist; not implemented yet (caller can pass via params if needed)
 */
const getDappStatusFromOrigin = (origin: string): 'trusted' | 'unsecured' => {
  if (!origin.startsWith('https://')) {
    return 'unsecured';
  }
  return 'trusted';
};

/**
 * Converts DappInfo to navigation-compatible dapp params for AuthorizeDapp sheet.
 * The navigation types expect icon: AvatarContent for immediate UI rendering.
 */
const toAuthorizeDappNavParams = (dappInfo: DappInfo) => ({
  icon: (dappInfo.imageUrl
    ? { img: { uri: dappInfo.imageUrl } }
    : { fallback: dappInfo.name.charAt(0).toUpperCase() }) as AvatarContent,
  name: dappInfo.name,
  category: 'DApp',
});

/**
 * Converts DappInfo to navigation-compatible dapp params for SignTx/SignData sheets.
 * The navigation types expect icon: AvatarContent for immediate UI rendering.
 */
const toSigningNavParams = (dappInfo: DappInfo) => ({
  icon: (dappInfo.imageUrl
    ? { img: { uri: dappInfo.imageUrl } }
    : { fallback: dappInfo.name.charAt(0).toUpperCase() }) as AvatarContent,
  name: dappInfo.name,
  origin: dappInfo.origin,
});

/**
 * Processes incoming WebView messages containing CIP-30 requests.
 *
 * Flow:
 * 1. Hook dispatches receiveWebViewMessage with the CIP-30 request
 * 2. This side effect processes it via handleCip30Message
 * 3. If authorization required, dispatches setPendingAuthRequest and navigates to sheet
 * 4. Otherwise, dispatches setWebViewResponse for hook to send back
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions and cardanoProvider
 * @returns Observable stream of actions to dispatch
 */
export const processWebViewMessage: SideEffect = (
  { cardanoDappConnector: { receiveWebViewMessage$ } },
  {
    cardanoDappConnector: {
      selectSessionAuthorizedOrigins$,
      selectSessionAccountByOrigin$,
      selectPendingAuthRequest$,
    },
    dappConnector: { selectAuthorizedDapps$ },
    cardanoContext: { selectAccountTransactionHistory$ },
    addresses: { selectAllAddresses$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
  },
  { actions, cardanoProvider },
) => {
  const addressesUpsert$ = new Subject<UpsertAddressesPayload>();

  const deriveNextUnusedAddress = createDeriveNextAddress({
    selectAccounts$: selectActiveNetworkAccounts$,
    selectAllAddresses$,
    upsertAddresses: payload => {
      addressesUpsert$.next(payload);
    },
  });

  const upsertAddressActions$ = addressesUpsert$.pipe(
    map(payload => actions.addresses.upsertAddresses(payload)),
  );

  const processed$ = receiveWebViewMessage$.pipe(
    map(action => action.payload),
    filter(payload => payload !== null),
    map(payload => ({
      ...payload,
      pageTitle: payload.message.pageTitle,
      faviconUrl: payload.message.faviconUrl,
    })),
    withLatestFrom(
      selectSessionAuthorizedOrigins$,
      selectAuthorizedDapps$,
      selectSessionAccountByOrigin$,
      selectActiveNetworkAccounts$,
      selectAll$,
      selectPendingAuthRequest$,
    ),
    mergeMap(
      ([
        { message, dappOrigin, pageTitle, faviconUrl },
        sessionOrigins,
        authorizedDapps,
        sessionAccountByOrigin,
        allAccounts,
        allWallets,
        existingPendingAuthRequest,
      ]) => {
        const handlerDeps = {
          authorizedDapps$: of(authorizedDapps ?? { Cardano: [] }),
          accountUtxos$: cardanoAccountUtxos$,
          accountUnspendableUtxos$: cardanoAccountUnspendableUtxos$,
          rewardAccountDetails$: cardanoRewardAccountDetails$,
          addresses$: cardanoAddresses$,
          accountTransactionHistory$: selectAccountTransactionHistory$,
          chainId$: cardanoChainId$,
          allAccounts$: of(allAccounts),
          allWallets$: of(allWallets),
          getAccountIdForOrigin: (origin: string) =>
            sessionAccountByOrigin[origin],
          isSessionAuthorized: (origin: string) =>
            (sessionOrigins ?? []).includes(origin),
          cardanoProvider,
          deriveNextUnusedAddress,
        };

        return from(handleCip30Message(message, dappOrigin, handlerDeps)).pipe(
          mergeMap(result => {
            if (result.type === 'response_ready') {
              const { response } = result;
              const webViewResponse: WebViewResponse = {
                ...response,
                timestamp: Date.now(),
              };
              return of(
                actions.cardanoDappConnector.setWebViewResponse(
                  webViewResponse,
                ),
              );
            } else if (result.type === 'signing_required') {
              const {
                requestId,
                dappOrigin: origin,
                dappName,
                signingType,
              } = result;

              if (signingType === 'signTx') {
                const dappInfo: DappInfo = {
                  name: pageTitle || dappName,
                  origin,
                  imageUrl: faviconUrl,
                };
                const pendingSignTxRequest = {
                  requestId,
                  dappOrigin: origin,
                  dapp: dappInfo,
                  txHex: result.txHex ?? '',
                  partialSign: result.partialSign ?? false,
                };

                NavigationControls.sheets.navigate(SheetRoutes.SignTx, {
                  requestId,
                  dapp: toSigningNavParams(dappInfo),
                  txHex: pendingSignTxRequest.txHex,
                  partialSign: pendingSignTxRequest.partialSign,
                });

                return of(
                  actions.cardanoDappConnector.setPendingSignTxRequest(
                    pendingSignTxRequest,
                  ),
                );
              }

              const dappInfo: DappInfo = {
                name: pageTitle || dappName,
                origin,
                imageUrl: faviconUrl,
              };
              const pendingSignDataRequest = {
                requestId,
                dappOrigin: origin,
                dapp: dappInfo,
                address: result.address ?? '',
                payload: result.payload ?? '',
              };

              NavigationControls.sheets.navigate(SheetRoutes.SignData, {
                requestId,
                dapp: toSigningNavParams(dappInfo),
                address: pendingSignDataRequest.address,
                payload: pendingSignDataRequest.payload,
              });

              return of(
                actions.cardanoDappConnector.setPendingSignDataRequest(
                  pendingSignDataRequest,
                ),
              );
            } else {
              const { requestId, dappOrigin: origin, dappName } = result;

              // Reject any pending auth request superseded by this new enable() call.
              const rejectOrphanedActions = existingPendingAuthRequest
                ? [
                    actions.cardanoDappConnector.setWebViewResponse({
                      id: existingPendingAuthRequest.requestId,
                      success: false,
                      error: {
                        code: APIErrorCode.Refused,
                        info: 'Superseded by a newer enable() request',
                      },
                      timestamp: Date.now(),
                    }),
                  ]
                : [];

              const dappInfo: DappInfo = {
                name: pageTitle || dappName,
                origin,
                imageUrl: faviconUrl,
              };
              const pendingRequest = {
                requestId,
                dappOrigin: origin,
                dapp: dappInfo,
              };

              NavigationControls.sheets.navigate(SheetRoutes.AuthorizeDapp, {
                dapp: toAuthorizeDappNavParams(dappInfo),
                dappOrigin: origin,
                dappStatus: getDappStatusFromOrigin(origin),
              });

              return of(
                ...rejectOrphanedActions,
                actions.cardanoDappConnector.setPendingAuthRequest(
                  pendingRequest,
                ),
              );
            }
          }),
          catchError(error => {
            const errorResponse: WebViewResponse = {
              id: message.id,
              success: false,
              error: {
                code: APIErrorCode.InternalError,
                info: error instanceof Error ? error.message : 'Unknown error',
              },
              timestamp: Date.now(),
            };
            return of(
              actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            );
          }),
        );
      },
    ),
  );

  return merge(processed$, upsertAddressActions$);
};

/**
 * Handles authorization confirmation/rejection responses.
 *
 * When user confirms or rejects in the authorization sheet:
 * 1. Redux updates lastAuthResponse
 * 2. This side effect creates a WebViewResponse and dispatches it
 *
 * @param _actionObservables - Observable streams of Redux actions (unused)
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions
 * @returns Observable stream of actions to dispatch
 */
export const handleAuthResponse: SideEffect = (
  _actionObservables,
  { cardanoDappConnector: { selectLastAuthResponse$ } },
  { actions },
) => {
  return selectLastAuthResponse$.pipe(
    filter(response => response !== null),
    switchMap(response => {
      const webViewResponse: WebViewResponse = response.authorized
        ? {
            id: response.requestId,
            success: true,
            result: true,
            timestamp: Date.now(),
          }
        : {
            id: response.requestId,
            success: false,
            error: {
              code: APIErrorCode.Refused,
              info: 'User declined authorization',
            },
            timestamp: Date.now(),
          };

      return of(
        actions.cardanoDappConnector.setWebViewResponse(webViewResponse),
        actions.cardanoDappConnector.clearLastAuthResponse(),
      );
    }),
  );
};

/**
 * Handles sign data (CIP-8) confirmation.
 *
 * Flow:
 * 1. User confirms in SignData sheet, triggering confirmSignData action
 * 2. Trigger authentication prompt for password/PIN
 * 3. Access auth secret and perform CIP-8 signing using mobile-specific implementation
 * 4. Send signed data response to WebView
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions and authPrompt
 * @returns Observable stream of actions to dispatch
 */
export const handleSignDataConfirmation: SideEffect = (
  { cardanoDappConnector: { confirmSignData$ } },
  {
    cardanoDappConnector: {
      selectPendingSignDataRequest$,
      selectSessionAccountByOrigin$,
    },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
    addresses: { selectAllAddresses$ },
  },
  { actions, accessAuthSecret, authenticate, signerFactory },
) => {
  return confirmSignData$.pipe(
    withLatestFrom(
      selectPendingSignDataRequest$,
      selectSessionAccountByOrigin$,
      selectActiveNetworkAccounts$,
      selectAll$,
      selectAllAddresses$,
    ),
    filter(([, pendingRequest]) => pendingRequest !== null),
    switchMap(
      ([
        ,
        pendingRequest,
        sessionAccountByOrigin,
        allAccounts,
        allWallets,
        allAddresses,
      ]) => {
        const { requestId, dappOrigin, address, payload } = pendingRequest!;
        const accountId = sessionAccountByOrigin[dappOrigin];
        const account = allAccounts.find(a => a.accountId === accountId);
        if (!account) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Account not found for origin: ${dappOrigin}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          );
        }

        if (!isCardanoAccount(account)) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Account is not a Cardano account: ${accountId}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          );
        }

        if (account.accountType === 'MultiSig') {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `signData is not supported for MultiSig accounts: ${accountId}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          );
        }

        const wallet = allWallets.find(w => w.walletId === account.walletId);
        if (!wallet || wallet.type !== WalletType.InMemory) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Wallet not found or not InMemory type`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignDataRequest(),
          );
        }

        const knownAddresses = transformToGroupedAddresses(
          allAddresses,
          accountId,
        );

        const dataSignerContext: CardanoSignerContext = {
          wallet,
          accountId,
          knownAddresses,
          auth: signerAuthFromPrompt(
            { accessAuthSecret, authenticate },
            {
              cancellable: true,
              confirmButtonLabel:
                'authentication-prompt.confirm-button-label.sign-data',
              message: 'authentication-prompt.message.sign-data',
            },
          ),
        };
        const dataSigner = signerFactory.createDataSigner(dataSignerContext);

        return dataSigner
          .signData({
            signWith: addrToSignWith(address),
            payload,
          })
          .pipe(
            take(1),
            mergeMap(signedData => {
              const successResponse: WebViewResponse = {
                id: requestId,
                success: true,
                result: signedData,
                timestamp: Date.now(),
              };
              return of(
                actions.cardanoDappConnector.setWebViewResponse(
                  successResponse,
                ),
                actions.cardanoDappConnector.clearPendingSignDataRequest(),
              );
            }),
            catchError(error => {
              if (error instanceof AuthenticationCancelledError) {
                const cancelResponse: WebViewResponse = {
                  id: requestId,
                  success: false,
                  error: {
                    code: APIErrorCode.Refused,
                    info: 'User cancelled authentication',
                  },
                  timestamp: Date.now(),
                };
                return of(
                  actions.cardanoDappConnector.setWebViewResponse(
                    cancelResponse,
                  ),
                  actions.cardanoDappConnector.clearPendingSignDataRequest(),
                );
              }
              const errorResponse: WebViewResponse = {
                id: requestId,
                success: false,
                error: {
                  code: APIErrorCode.InternalError,
                  info:
                    error instanceof Error ? error.message : 'Signing failed',
                },
                timestamp: Date.now(),
              };
              return of(
                actions.cardanoDappConnector.setWebViewResponse(errorResponse),
                actions.cardanoDappConnector.clearPendingSignDataRequest(),
              );
            }),
          );
      },
    ),
  );
};

/**
 * Handles sign data rejection.
 *
 * When user rejects in the SignData sheet:
 * 1. Creates an error response with Refused code
 * 2. Sends it to WebView
 * 3. Clears the pending request
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions
 * @returns Observable stream of actions to dispatch
 */
export const handleSignDataRejection: SideEffect = (
  { cardanoDappConnector: { rejectSignData$ } },
  { cardanoDappConnector: { selectPendingSignDataRequest$ } },
  { actions },
) => {
  return rejectSignData$.pipe(
    withLatestFrom(selectPendingSignDataRequest$),
    filter(([, pendingRequest]) => pendingRequest !== null),
    switchMap(([, pendingRequest]) => {
      const errorResponse: WebViewResponse = {
        id: pendingRequest!.requestId,
        success: false,
        error: {
          code: APIErrorCode.Refused,
          info: 'User declined to sign data',
        },
        timestamp: Date.now(),
      };

      return of(
        actions.cardanoDappConnector.setWebViewResponse(errorResponse),
        actions.cardanoDappConnector.clearPendingSignDataRequest(),
      );
    }),
  );
};

/**
 * Handles sign transaction confirmation.
 *
 * Flow:
 * 1. User confirms in SignTx sheet, triggering confirmSignTx action
 * 2. Validate transaction does not require foreign signatures (unless partialSign)
 * 3. Trigger authentication prompt for password/PIN
 * 4. Access auth secret and perform transaction signing
 * 5. Send witness set CBOR response to WebView
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions, authPrompt, and cardanoProvider
 * @returns Observable stream of actions to dispatch
 */
export const handleSignTxConfirmation: SideEffect = (
  { cardanoDappConnector: { confirmSignTx$ } },
  {
    cardanoDappConnector: {
      selectPendingSignTxRequest$,
      selectSessionAccountByOrigin$,
    },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
    addresses: { selectAllAddresses$ },
    cardanoContext: { selectChainId$, selectAccountUtxos$ },
  },
  { actions, accessAuthSecret, authenticate, signerFactory },
) => {
  return confirmSignTx$.pipe(
    withLatestFrom(
      selectPendingSignTxRequest$,
      selectSessionAccountByOrigin$,
      selectActiveNetworkAccounts$,
      selectAll$,
      selectAllAddresses$,
      selectChainId$,
      selectAccountUtxos$,
    ),
    filter(([, pendingRequest]) => pendingRequest !== null),
    switchMap(
      ([
        ,
        pendingRequest,
        sessionAccountByOrigin,
        allAccounts,
        allWallets,
        allAddresses,
        chainId,
        accountUtxos,
      ]) => {
        const {
          requestId,
          dappOrigin,
          txHex,
          partialSign: isPartialSign,
        } = pendingRequest!;
        const accountId = sessionAccountByOrigin[dappOrigin];
        const account = allAccounts.find(a => a.accountId === accountId);
        if (!account) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Account not found for origin: ${dappOrigin}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          );
        }

        if (!isCardanoAccount(account)) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Account is not a Cardano account: ${accountId}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          );
        }

        if (account.accountType === 'MultiSig') {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `signTx is not supported for MultiSig accounts: ${accountId}`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          );
        }

        const wallet = allWallets.find(w => w.walletId === account.walletId);
        if (!wallet || wallet.type !== WalletType.InMemory) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: `Wallet not found or not InMemory type`,
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          );
        }

        if (!chainId) {
          const errorResponse: WebViewResponse = {
            id: requestId,
            success: false,
            error: {
              code: APIErrorCode.InternalError,
              info: 'Chain ID is undefined',
            },
            timestamp: Date.now(),
          };
          return of(
            actions.cardanoDappConnector.setWebViewResponse(errorResponse),
            actions.cardanoDappConnector.clearPendingSignTxRequest(),
          );
        }

        const knownAddresses = transformToGroupedAddresses(
          allAddresses,
          accountId,
        );

        const { accountIndex, extendedAccountPublicKey } =
          account.blockchainSpecific as {
            accountIndex: number;
            extendedAccountPublicKey: Bip32PublicKeyHex;
          };

        const localUtxos = accountUtxos[accountId] ?? [];

        return from(
          (async () => {
            const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
            const bip32Account = new Bip32Account(
              { extendedAccountPublicKey, accountIndex, chainId },
              { blake2b, bip32Ed25519 },
            );
            const dRepPubKey = await bip32Account.derivePublicKey({
              index: 0,
              role: KeyRole.DRep,
            });
            const dRepKeyHash = Crypto.Ed25519PublicKey.fromHex(dRepPubKey)
              .hash()
              .hex();

            return { dRepKeyHash };
          })(),
        ).pipe(
          switchMap(({ dRepKeyHash }) => {
            if (!isPartialSign) {
              if (
                requiresForeignSignaturesFromCbor(
                  txHex,
                  localUtxos,
                  knownAddresses,
                  dRepKeyHash,
                )
              ) {
                const errorResponse: WebViewResponse = {
                  id: requestId,
                  success: false,
                  error: {
                    code: TxSignErrorCode.ProofGeneration,
                    info: 'The wallet does not have the secret key associated with some of the inputs or certificates.',
                  },
                  timestamp: Date.now(),
                };
                return of(
                  actions.cardanoDappConnector.setWebViewResponse(
                    errorResponse,
                  ),
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                );
              }
            }

            const signerContext: CardanoTransactionSignerContext = {
              wallet,
              accountId,
              knownAddresses,
              utxo: localUtxos,
              auth: signerAuthFromPrompt(
                { accessAuthSecret, authenticate },
                {
                  cancellable: true,
                  confirmButtonLabel:
                    'authentication-prompt.confirm-button-label.sign-tx',
                  message: 'authentication-prompt.message.sign-tx',
                },
              ),
            };
            const signer = signerFactory.createTransactionSigner(signerContext);

            return signer.sign({ serializedTx: HexBytes(txHex) }).pipe(
              take(1),
              mergeMap(result => {
                // CIP-30 signTx returns just the witness set, not the full signed tx
                const signedTx = Serialization.Transaction.fromCbor(
                  Serialization.TxCBOR(result.serializedTx),
                );
                const witnessSetCbor = signedTx.witnessSet().toCbor();
                const successResponse: WebViewResponse = {
                  id: requestId,
                  success: true,
                  result: witnessSetCbor,
                  timestamp: Date.now(),
                };
                return of(
                  actions.cardanoDappConnector.setWebViewResponse(
                    successResponse,
                  ),
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                );
              }),
              catchError(error => {
                if (error instanceof AuthenticationCancelledError) {
                  const cancelResponse: WebViewResponse = {
                    id: requestId,
                    success: false,
                    error: {
                      code: APIErrorCode.Refused,
                      info: 'User cancelled authentication',
                    },
                    timestamp: Date.now(),
                  };
                  return of(
                    actions.cardanoDappConnector.setWebViewResponse(
                      cancelResponse,
                    ),
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  );
                }
                const errorResponse: WebViewResponse = {
                  id: requestId,
                  success: false,
                  error: {
                    code: APIErrorCode.InternalError,
                    info:
                      error instanceof Error
                        ? error.message
                        : 'Transaction signing failed',
                  },
                  timestamp: Date.now(),
                };
                return of(
                  actions.cardanoDappConnector.setWebViewResponse(
                    errorResponse,
                  ),
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                );
              }),
            );
          }),
          catchError(error => {
            const errorResponse: WebViewResponse = {
              id: requestId,
              success: false,
              error: {
                code: APIErrorCode.InternalError,
                info:
                  error instanceof Error
                    ? error.message
                    : 'Pre-validation failed',
              },
              timestamp: Date.now(),
            };
            return of(
              actions.cardanoDappConnector.setWebViewResponse(errorResponse),
              actions.cardanoDappConnector.clearPendingSignTxRequest(),
            );
          }),
        );
      },
    ),
  );
};

/**
 * Handles sign transaction rejection.
 *
 * When user rejects in the SignTx sheet:
 * 1. Creates an error response with Refused code
 * 2. Sends it to WebView
 * 3. Clears the pending request
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions
 * @returns Observable stream of actions to dispatch
 */
export const handleSignTxRejection: SideEffect = (
  { cardanoDappConnector: { rejectSignTx$ } },
  { cardanoDappConnector: { selectPendingSignTxRequest$ } },
  { actions },
) => {
  return rejectSignTx$.pipe(
    withLatestFrom(selectPendingSignTxRequest$),
    filter(([, pendingRequest]) => pendingRequest !== null),
    switchMap(([, pendingRequest]) => {
      const errorResponse: WebViewResponse = {
        id: pendingRequest!.requestId,
        success: false,
        error: {
          code: APIErrorCode.Refused,
          info: 'User declined to sign transaction',
        },
        timestamp: Date.now(),
      };

      return of(
        actions.cardanoDappConnector.setWebViewResponse(errorResponse),
        actions.cardanoDappConnector.clearPendingSignTxRequest(),
      );
    }),
  );
};

/**
 * Resolves foreign transaction inputs using the Cardano provider when a mobile signTx request is set.
 *
 * This side effect listens for setPendingSignTxRequest actions with non-null payloads and:
 * 1. Parses the transaction to extract input references
 * 2. Identifies which inputs are not in the local wallet's UTXOs (foreign inputs)
 * 3. Resolves foreign inputs via the Cardano provider API
 * 4. Stores the resolved addresses in Redux state for display in the signing UI
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param stateObservables - Observable streams of Redux state selectors
 * @param dependencies - Side effect dependencies including actions and cardanoProvider
 * @returns Observable stream of actions to dispatch
 */
export const resolveForeignTransactionInputsMobile: SideEffect = (
  { cardanoDappConnector: { setPendingSignTxRequest$ } },
  { cardanoContext: { selectAccountUtxos$, selectChainId$ } },
  { actions, cardanoProvider },
) =>
  createResolveForeignInputsFlow({
    triggerAction$: setPendingSignTxRequest$.pipe(
      filter(({ payload }) => payload !== null),
    ),
    getTxHex: ({ payload }) => payload!.txHex,
    selectAccountUtxos$,
    selectChainId$,
    cardanoProvider,
    actions: actions.cardanoDappConnector,
  });

/**
 * Clears resolved transaction inputs when mobile signTx request is cleared.
 *
 * Listens for clearPendingSignTxRequest actions and dispatches clearResolvedTransactionInputs
 * to clean up the resolved input state in Redux.
 *
 * @param actionObservables - Observable streams of Redux actions
 * @param _stateObservables - Observable streams of Redux state selectors (unused)
 * @param dependencies - Side effect dependencies including actions
 * @returns Observable stream of actions to dispatch
 */
export const clearResolvedInputsOnMobileSignTxClear: SideEffect = (
  { cardanoDappConnector: { clearPendingSignTxRequest$ } },
  _,
  { actions },
) =>
  clearPendingSignTxRequest$.pipe(
    map(() => actions.cardanoDappConnector.clearResolvedTransactionInputs()),
  );

/**
 * Persists authorized dApps to the contract-level store on mobile.
 *
 * On extension, the `promptCardanoAuthorizeDapp` side effect dispatches
 * `authorizeDapp.completed` after user confirmation, which adds the dApp
 * to the persisted `authorizedDappsSlice`. On mobile, the authorization
 * flow is WebView-based and was missing this dispatch.
 *
 * Flow:
 * 1. `setPendingAuthRequest` captures the dApp info before auth begins
 * 2. `selectLastAuthResponse$` emits after user confirms or rejects
 * 3. If authorized, dispatches `authorizeDapp.completed` to persist the dApp
 */
export const persistAuthorizedDapp: SideEffect = (
  { cardanoDappConnector: { setPendingAuthRequest$ } },
  { cardanoDappConnector: { selectLastAuthResponse$ } },
  { actions },
) =>
  setPendingAuthRequest$.pipe(
    filter(({ payload }) => payload !== null),
    switchMap(({ payload: pendingRequest }) =>
      selectLastAuthResponse$.pipe(
        filter(response => response !== null),
        filter(response => response.requestId === pendingRequest!.requestId),
        take(1),
        filter(response => response.authorized),
        map(() =>
          actions.authorizeDapp.completed({
            authorized: true,
            dapp: {
              id: DappId(pendingRequest!.dappOrigin),
              name: pendingRequest!.dapp.name,
              origin: pendingRequest!.dapp.origin,
              imageUrl: pendingRequest!.dapp.imageUrl ?? '',
            },
            blockchainName: 'Cardano',
          }),
        ),
      ),
    ),
  );

/**
 * Array of all mobile-specific side effects for the Cardano dApp connector.
 *
 * These side effects handle the complete mobile dApp connector lifecycle including
 * WebView message processing, authentication flows, and signing operations.
 */
export const mobileSideEffects: SideEffect[] = [
  processWebViewMessage,
  handleAuthResponse,
  persistAuthorizedDapp,
  handleSignDataConfirmation,
  handleSignDataRejection,
  handleSignTxConfirmation,
  handleSignTxRejection,
  resolveForeignTransactionInputsMobile,
  clearResolvedInputsOnMobileSignTxClear,
];
