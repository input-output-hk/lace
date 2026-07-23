import { Serialization } from '@cardano-sdk/core';
import { KeyRole } from '@cardano-sdk/key-management';
import {
  buildCip30SignTxWitnessSet,
  countTransactionSignatures,
  isCardanoAccount,
} from '@lace-contract/cardano-context';
import {
  AuthenticationCancelledError,
  signerAuthFromPrompt,
} from '@lace-contract/signer';
import { isHardwareWallet } from '@lace-contract/wallet-repo';
import { deriveBip32PublicKey, hashEd25519PublicKey } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import { mapHwSigningError } from '@lace-lib/util-hw';
import {
  debounceTime,
  EMPTY,
  exhaustMap,
  filter,
  firstValueFrom,
  ignoreElements,
  map,
  merge,
  mergeMap,
  of,
  race,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';

import {
  APIError,
  APIErrorCode,
  TxSignError,
  TxSignErrorCode,
} from '../../common/api-error';
import { createPendingDappActivity } from '../../common/store/create-pending-dapp-activity';
import { createDeriveNextAddress } from '../../common/store/derive-next-address';
import { createResolveForeignInputsFlow } from '../../common/store/resolve-foreign-inputs';
import { transformToGroupedAddresses } from '../../common/store/util';
import { requiresForeignSignaturesFromCbor } from '../../common/store/utils/input-resolver';
import { CARDANO_DAPP_CONNECT_LOCATION } from '../const';

import {
  detectViewClosure,
  findTargetSidePanel,
  signData$,
  signTx$,
  type SigningResult,
} from './util';

import type {
  DeriveNextUnusedAddressFunction,
  SignTransactionFunction,
} from '../../common/store/dependencies/cardano-dapp-connector-api';
import type {
  CardanoConfirmationRequest,
  CardanoRequestType,
} from '../../common/store/dependencies/create-confirmation-callback';
import type { ActionCreators, SideEffect } from '../../index';
import type { Cbor } from '../types';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  AnyAddress,
  UpsertAddressesPayload,
} from '@lace-contract/addresses';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AccountUtxoMap,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { ActionType } from '@lace-contract/module';
import type { LaceInitSync, ViewId } from '@lace-contract/module';
import type { SignerFactory } from '@lace-contract/signer';
import type { View } from '@lace-contract/views';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

/**
 * Type guard to check if a request is of a specific type.
 *
 * @param request - The confirmation request to check
 * @param requestType - The expected request type
 * @returns True if the request matches the specified type
 */
const isRequestOfType = (
  request: CardanoConfirmationRequest,
  requestType: CardanoRequestType,
): boolean => 'type' in request && request.type === requestType;

/**
 * Parameters for creating a signTransaction wrapper function.
 */
type CreateSignTransactionWrapperParams = {
  /** Observable of all addresses */
  selectAllAddresses$: Observable<AnyAddress[]>;
  /** Observable of all accounts */
  selectActiveNetworkAccounts$: Observable<AnyAccount[]>;
  /** Observable of all wallets */
  selectAll$: Observable<AnyWallet[]>;
  /** Observable of the current chain ID */
  selectChainId$: Observable<Cardano.ChainId | undefined>;
  selectAvailableAccountUtxos$: Observable<AccountUtxoMap>;
  /** Function to get account ID for a specific origin */
  getAccountIdForOrigin: () => Record<string, AccountId>;
  /** Signer factory for signing */
  signerFactory: SignerFactory;
  /** Function to get auth secret */
  accessAuthSecret: AccessAuthSecret;
  /** Function to show auth prompt */
  authenticate: Authenticate;
  /** Subject to signal signing completion to the popup flow */
  signingResult$: Subject<SigningResult>;
};

/**
 * Creates a signTransaction wrapper that uses the signer factory.
 */
const createSignTransactionWrapper = ({
  selectAllAddresses$,
  selectActiveNetworkAccounts$,
  selectAll$,
  selectChainId$,
  selectAvailableAccountUtxos$,
  getAccountIdForOrigin,
  signerFactory,
  accessAuthSecret,
  authenticate,
  signingResult$,
}: CreateSignTransactionWrapperParams): SignTransactionFunction => {
  return async (
    txCbor: Cbor,
    partialSign: boolean,
    origin: string,
  ): Promise<Cbor> => {
    const sessionAccountByOrigin = getAccountIdForOrigin();
    const accountId = sessionAccountByOrigin[origin];

    if (!accountId) {
      throw new APIError(
        APIErrorCode.InternalError,
        `No account found for origin: ${origin}. Please reconnect the dApp.`,
      );
    }

    const chainId = await firstValueFrom(selectChainId$);
    if (!chainId) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Cannot sign transaction: chain ID is undefined',
      );
    }

    const allAccounts = await firstValueFrom(selectActiveNetworkAccounts$);
    const account = allAccounts.find(a => a.accountId === accountId);
    if (!account) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Account not found for ID: ${accountId}`,
      );
    }

    if (!isCardanoAccount(account) || account.accountType === 'MultiSig') {
      throw new APIError(
        APIErrorCode.InternalError,
        `signTx is only supported for single-sig Cardano accounts`,
      );
    }

    const allWallets = await firstValueFrom(selectAll$);
    const wallet = allWallets.find(w => w.walletId === account.walletId);
    if (!wallet) {
      throw new APIError(
        APIErrorCode.InternalError,
        `Wallet not found for ID: ${account.walletId}`,
      );
    }

    const allAddresses = await firstValueFrom(selectAllAddresses$);
    const knownAddresses = transformToGroupedAddresses(allAddresses, accountId);

    const availableAccountUtxos = await firstValueFrom(
      selectAvailableAccountUtxos$,
    );
    const localUtxos = availableAccountUtxos[accountId] ?? [];

    const { extendedAccountPublicKey } = account.blockchainSpecific as {
      extendedAccountPublicKey: Bip32PublicKeyHex;
    };

    const dRepKeyHash = hashEd25519PublicKey(
      await deriveBip32PublicKey(extendedAccountPublicKey, KeyRole.DRep, 0),
    );

    if (
      !partialSign &&
      requiresForeignSignaturesFromCbor(
        txCbor,
        localUtxos,
        knownAddresses,
        dRepKeyHash,
      )
    ) {
      throw new TxSignError(
        TxSignErrorCode.ProofGeneration,
        'The wallet does not have the secret key associated with some of the inputs or certificates.',
      );
    }

    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    const signerContext: CardanoTransactionSignerContext = {
      wallet,
      accountId,
      knownAddresses,
      utxo: localUtxos,
      auth,
    };
    try {
      const signer = signerFactory.createTransactionSigner(signerContext);
      const result = await firstValueFrom(
        signer.sign({ serializedTx: HexBytes(txCbor) }),
      );
      if (
        partialSign &&
        countTransactionSignatures(
          Serialization.TxCBOR(result.serializedTx),
        ) === 0
      ) {
        throw new TxSignError(
          TxSignErrorCode.ProofGeneration,
          'The wallet does not have the secret key associated with any of the inputs and certificates.',
        );
      }
      signingResult$.next({ type: 'success' });
      return buildCip30SignTxWitnessSet(
        Serialization.TxCBOR(txCbor),
        Serialization.TxCBOR(result.serializedTx),
      );
    } catch (error) {
      if (error instanceof AuthenticationCancelledError) {
        signingResult$.next({ type: 'cancelled' });
      } else {
        const hwErrorKeys = isHardwareWallet(wallet)
          ? mapHwSigningError(error)
          : undefined;
        signingResult$.next({ type: 'error', hwErrorKeys });
      }
      throw error;
    }
  };
};

/**
 * Main side effect for the Cardano dApp connector extension.
 *
 * Handles CIP-30 API connection and routes signTx/signData requests to their
 * respective popup flows. Maintains session account mapping for per-dApp isolation.
 *
 * @param actionObservables - Observables for user confirmation/rejection actions
 * @param stateObservables - Observables for state (views, authorized dApps, etc.)
 * @param dependencies - Dependencies including connectCardanoDappConnector, actions, authPrompt
 * @returns Observable that emits Redux actions
 */
export const connectCardanoDappConnectorApi: SideEffect = (
  {
    cardanoDappConnector: {
      confirmSignTx$,
      rejectSignTx$,
      confirmSignData$,
      rejectSignData$,
    },
    views: { viewDisconnected$ },
  },
  {
    views: { selectOpenViews$ },
    appLock: { isUnlocked$ },
    dappConnector: { selectAuthorizedDapps$ },
    cardanoContext: {
      selectChainId$,
      selectAvailableAccountUtxos$,
      selectAccountUnspendableUtxos$,
      selectAccountTransactionHistory$,
      selectRewardAccountDetails$,
    },
    addresses: { selectAllAddresses$ },
    cardanoDappConnector: { selectSessionAccountByOrigin$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
  },
  {
    connectCardanoDappConnector,
    actions,
    accessAuthSecret,
    authenticate,
    cardanoProvider,
    signerFactory,
    logger,
  },
) => {
  const signingResult$ = new Subject<SigningResult>();
  const addressesUpsert$ = new Subject<UpsertAddressesPayload>();
  const pendingActivityDispatch$ = new Subject<ActionType<ActionCreators>>();

  let sessionAccountByOrigin: Record<string, AccountId> = {};

  const submitTransaction = async (cbor: string): Promise<string> => {
    const chainId = await firstValueFrom(selectChainId$);
    if (!chainId) {
      throw new APIError(
        APIErrorCode.InternalError,
        'Cannot submit transaction: chain ID is undefined',
      );
    }
    const result = await firstValueFrom(
      cardanoProvider.submitTx({ signedTransaction: cbor }, { chainId }),
    );
    if (result.isErr()) throw result.error;

    try {
      const [allAddresses, accountUtxos] = await Promise.all([
        firstValueFrom(selectAllAddresses$),
        firstValueFrom(selectAvailableAccountUtxos$),
      ]);
      const pendingActivity = createPendingDappActivity({
        serializedTx: cbor,
        accountUtxos,
        allAddresses,
      });
      if (pendingActivity) {
        pendingActivityDispatch$.next(
          actions.activities.upsertActivities({
            accountId: pendingActivity.accountId,
            activities: [pendingActivity],
          }),
        );
      }
    } catch (error) {
      logger.error(
        '[dapp-connector-cardano] failed to derive pending activity from submitted tx',
        error,
      );
    }

    return result.value;
  };

  const signTransactionWrapper = createSignTransactionWrapper({
    selectAllAddresses$,
    selectActiveNetworkAccounts$,
    selectAll$,
    selectChainId$,
    selectAvailableAccountUtxos$,
    getAccountIdForOrigin: () => sessionAccountByOrigin,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
  });

  const deriveNextUnusedAddress: DeriveNextUnusedAddressFunction =
    createDeriveNextAddress({
      selectAccounts$: selectActiveNetworkAccounts$,
      selectAllAddresses$,
      upsertAddresses: payload => {
        addressesUpsert$.next(payload);
      },
    });

  const updateAccountMapping$ = selectSessionAccountByOrigin$.pipe(
    tap(mapping => {
      sessionAccountByOrigin = mapping;
    }),
    ignoreElements(),
  );

  const upsertAddressActions$ = addressesUpsert$.pipe(
    map(payload => actions.addresses.upsertAddresses(payload)),
  );

  const connector$ = connectCardanoDappConnector({
    rewardAccountDetails$: selectRewardAccountDetails$,
    authorizedDapps$: selectAuthorizedDapps$,
    accountUtxos$: selectAvailableAccountUtxos$,
    accountUnspendableUtxos$: selectAccountUnspendableUtxos$,
    addresses$: selectAllAddresses$,
    accountTransactionHistory$: selectAccountTransactionHistory$,
    chainId$: selectChainId$,
    allAccounts$: selectActiveNetworkAccounts$,
    allWallets$: selectAll$,
    getAccountIdForOrigin: (origin: string) => sessionAccountByOrigin[origin],
    signTransaction: signTransactionWrapper,
    submitTransaction,
    deriveNextUnusedAddress,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
    handleRequests: request$ =>
      request$.pipe(
        exhaustMap(request =>
          isUnlocked$.pipe(
            filter(Boolean),
            take(1),
            switchMap(() => {
              if (isRequestOfType(request, 'signTx')) {
                return signTx$({
                  request,
                  selectOpenViews$,
                  actions,
                  confirmSignTx$,
                  rejectSignTx$,
                  viewDisconnected$,
                  signingResult$,
                });
              }

              if (isRequestOfType(request, 'signData')) {
                return signData$({
                  request,
                  selectOpenViews$,
                  actions,
                  confirmSignData$,
                  rejectSignData$,
                  viewDisconnected$,
                  signingResult$,
                });
              }

              return EMPTY;
            }),
          ),
        ),
      ),
  });

  return merge(
    updateAccountMapping$,
    upsertAddressActions$,
    connector$,
    pendingActivityDispatch$,
  );
};

/**
 * Opens the authorization UI (sheet or popup) and waits for user confirmation.
 * Extracted so both the normal and auto-connect-fallback paths can use it.
 */
const handleAuthorizeDappUI = ({
  dapp,
  windowId,
  selectOpenViews$,
  confirmConnect$,
  rejectConnect$,
  viewDisconnected$,
  locationChanged$,
  authorizeDapp,
  actions,
}: {
  dapp: Dapp;
  windowId: number | undefined;
  selectOpenViews$: Observable<View[]>;
  confirmConnect$: Observable<{ payload: { account: AnyAccount } }>;
  rejectConnect$: Observable<unknown>;
  viewDisconnected$: Observable<{ payload: ViewId }>;
  locationChanged$: Observable<{
    payload: { viewId: ViewId; location: string };
  }>;
  authorizeDapp: {
    completed$: Observable<{ payload: { dapp: { id: string } } }>;
    failed$: Observable<{ payload: { dapp: { id: string } } }>;
  };
  actions: ActionCreators;
}) =>
  selectOpenViews$.pipe(
    take(1),
    switchMap(openViews => {
      const targetSidePanel = findTargetSidePanel(openViews, windowId);

      const openAction$ = targetSidePanel
        ? of(
            actions.views.setActiveSheetPage({
              route: 'AuthorizeDapp',
              params: {
                dapp: {
                  icon: { type: 'uri', uri: dapp.imageUrl ?? '' },
                  name: dapp.name,
                  category: '',
                },
                dappOrigin: dapp.origin,
              },
              targetViewId: targetSidePanel.id,
            }),
          )
        : of(
            actions.views.openView({
              type: 'popupWindow',
              location: CARDANO_DAPP_CONNECT_LOCATION,
            }),
          );

      const pendingAuthRequest =
        actions.cardanoDappConnector.setPendingAuthRequest({
          requestId: `${dapp.origin}-${Date.now()}`,
          dappOrigin: dapp.origin,
          dapp: {
            name: dapp.name,
            origin: dapp.origin,
            imageUrl: dapp.imageUrl || undefined,
          },
        });

      if (targetSidePanel) {
        const sheetConfirmOrReject$ = race(
          confirmConnect$.pipe(
            map(({ payload }) => ({
              type: 'confirm' as const,
              account: payload.account,
            })),
          ),
          rejectConnect$.pipe(map(() => ({ type: 'reject' as const }))),
          viewDisconnected$.pipe(
            filter(({ payload }) => payload === targetSidePanel.id),
            map(() => ({ type: 'reject' as const })),
          ),
          // On a dropped connection the contract resolves the request as denied
          // and emits failed. Dismiss the now-stale sheet without authorizing —
          // a late confirm must not grant access the dApp already saw refused.
          authorizeDapp.failed$.pipe(
            filter(({ payload }) => payload.dapp.id === dapp.id),
            map(() => ({ type: 'cancelled' as const })),
          ),
        ).pipe(take(1));

        return merge(
          openAction$,
          of(pendingAuthRequest),
          sheetConfirmOrReject$.pipe(
            mergeMap(result => {
              if (result.type === 'confirm' && result.account) {
                return [
                  actions.views.setActiveSheetPage(null),
                  actions.cardanoDappConnector.confirmAuth({
                    authorized: true,
                    account: result.account,
                  }),
                  actions.cardanoDappConnector.setSessionAccountForOrigin({
                    origin: dapp.origin,
                    accountId: result.account.accountId,
                  }),
                  actions.authorizeDapp.completed({
                    authorized: true,
                    dapp,
                    blockchainName: 'Cardano',
                  }),
                ];
              }
              if (result.type === 'cancelled') {
                return [
                  actions.views.setActiveSheetPage(null),
                  actions.cardanoDappConnector.clearPendingAuthRequest(),
                ];
              }
              return [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingAuthRequest(),
                actions.authorizeDapp.completed({
                  authorized: false,
                  dapp,
                }),
              ];
            }),
          ),
        );
      }

      const confirmOrReject$ = race(
        confirmConnect$.pipe(
          map(({ payload: { account } }) => ({
            type: 'confirm' as const,
            account,
          })),
        ),
        rejectConnect$.pipe(map(() => ({ type: 'reject' as const }))),
      ).pipe(take(1));

      // Subscribed eagerly via the race below (before the popup registers) so
      // a drop during the opening gap isn't missed. Closes the popup and
      // clears the request; never authorizes (the contract already denied it).
      const cancelled$ = authorizeDapp.failed$.pipe(
        filter(({ payload }) => payload.dapp.id === dapp.id),
        take(1),
        mergeMap(() =>
          merge(
            of(actions.cardanoDappConnector.clearPendingAuthRequest()),
            selectOpenViews$.pipe(
              map(views =>
                views.find(
                  view => view.location === CARDANO_DAPP_CONNECT_LOCATION,
                ),
              ),
              filter(Boolean),
              take(1),
              map(view => actions.views.closeView(view.id)),
            ),
          ),
        ),
      );

      return merge(
        openAction$,
        of(pendingAuthRequest),
        race(
          cancelled$,
          selectOpenViews$.pipe(
            map(views =>
              views.find(
                view => view.location === CARDANO_DAPP_CONNECT_LOCATION,
              ),
            ),
            filter(Boolean),
            take(1),
            switchMap(dappConnectorView =>
              race(
                confirmOrReject$.pipe(
                  mergeMap(result => {
                    const baseActions = [
                      actions.views.closeView(dappConnectorView.id),
                      actions.cardanoDappConnector.clearPendingAuthRequest(),
                    ];
                    if (result.type === 'confirm') {
                      return [
                        ...baseActions,
                        actions.cardanoDappConnector.confirmAuth({
                          authorized: true,
                          account: result.account,
                        }),
                        actions.cardanoDappConnector.setSessionAccountForOrigin(
                          {
                            origin: dapp.origin,
                            accountId: result.account.accountId,
                          },
                        ),
                        actions.authorizeDapp.completed({
                          authorized: true,
                          dapp,
                          blockchainName: 'Cardano',
                        }),
                      ];
                    }
                    return [
                      ...baseActions,
                      actions.authorizeDapp.completed({
                        authorized: false,
                        dapp,
                      }),
                    ];
                  }),
                ),
                merge(
                  viewDisconnected$.pipe(
                    filter(({ payload }) => payload === dappConnectorView.id),
                  ),
                  locationChanged$.pipe(
                    filter(
                      ({ payload }) =>
                        payload.viewId === dappConnectorView.id &&
                        payload.location !== CARDANO_DAPP_CONNECT_LOCATION,
                    ),
                  ),
                  detectViewClosure({
                    dappConnectorView,
                    selectOpenViews$,
                  }),
                ).pipe(
                  take(1),
                  mergeMap(() => [
                    actions.cardanoDappConnector.clearPendingAuthRequest(),
                    actions.authorizeDapp.completed({
                      authorized: false,
                      dapp,
                    }),
                  ]),
                  takeUntil(
                    merge(authorizeDapp.completed$, authorizeDapp.failed$).pipe(
                      filter(({ payload }) => payload.dapp.id === dapp.id),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }),
  );

/**
 * Handles the authorization popup for Cardano dApps.
 *
 * Listens for authorizeDapp.start$ actions with blockchainName === 'Cardano'
 * and opens the authorization popup at CARDANO_DAPP_CONNECT_LOCATION.
 * Manages the full connection flow including user confirmation/rejection
 * and popup closure detection.
 *
 * @param actionObservables - Action observables including authorizeDapp and cardanoDappConnector
 * @param stateObservables - State observables including selectOpenViews$
 * @param dependencies - Dependencies including actions and logger
 * @returns Observable that emits Redux actions for the authorization flow
 */
export const promptCardanoAuthorizeDapp: SideEffect = (
  {
    authorizeDapp,
    cardanoDappConnector: { confirmConnect$, rejectConnect$ },
    views: { viewDisconnected$, locationChanged$ },
  },
  {
    views: { selectOpenViews$ },
    dappConnector: { selectAuthorizedDapps$ },
    wallets: { selectActiveNetworkAccounts$, selectAll$ },
    cardanoDappConnector: { selectSessionAccountByOrigin$ },
  },
  { actions, logger },
) =>
  authorizeDapp.start$.pipe(
    tap(({ payload }) => {
      logger.debug(
        '[promptCardanoAuthorizeDapp] authorizeDapp.start$ received:',
        payload.blockchainName,
        payload.dapp.origin,
      );
    }),
    filter(({ payload }) => payload.blockchainName === 'Cardano'),
    debounceTime(100),
    tap(({ payload }) => {
      logger.debug(
        '[promptCardanoAuthorizeDapp] Passed Cardano filter and debounce, entering switchMap for:',
        payload.dapp.origin,
      );
    }),
    withLatestFrom(
      selectAuthorizedDapps$,
      selectActiveNetworkAccounts$,
      selectAll$,
      selectSessionAccountByOrigin$,
    ),
    // switchMap, not exhaustMap: a fresh enable() must supersede a previous
    // prompt that can no longer resolve (dApp disconnected mid-sheet);
    // exhaustMap would swallow it, hanging the dApp on reconnect. Safe because
    // the contract serializes starts, so we never cancel a prompt still in use.
    switchMap(
      ([
        {
          payload: { dapp, windowId },
        },
        authorizedDapps,
        allAccounts,
        allWallets,
        sessionAccountByOrigin,
      ]) => {
        const isPersisted = (authorizedDapps.Cardano ?? []).some(
          d => d.dapp.origin === dapp.origin,
        );
        const cardanoAccounts = allAccounts.filter(
          a => a.blockchainName === 'Cardano',
        );

        // Reuse the account chosen for this dapp this session so repeated
        // enable() calls don't re-open the picker.
        const sessionAccountId = sessionAccountByOrigin[dapp.origin];
        const sessionAccount = sessionAccountId
          ? cardanoAccounts.find(a => a.accountId === sessionAccountId)
          : undefined;

        // One wallet, one Cardano account: nothing to pick.
        const onlyAccount =
          allWallets.length === 1 && cardanoAccounts.length === 1
            ? cardanoAccounts[0]
            : undefined;

        // Auto-grant (no UI) when the account is unambiguous.
        const autoGrantAccount = isPersisted
          ? sessionAccount ?? onlyAccount
          : undefined;

        // Single account + persisted dapp: auto-confirm without UI.
        if (autoGrantAccount) {
          return of(
            actions.cardanoDappConnector.setPendingAuthRequest({
              requestId: `auto-${dapp.origin}`,
              dappOrigin: dapp.origin,
              dapp: {
                name: dapp.name,
                origin: dapp.origin,
                imageUrl: dapp.imageUrl || undefined,
              },
            }),
            actions.cardanoDappConnector.confirmAuth({
              authorized: true,
              account: autoGrantAccount,
            }),
            actions.authorizeDapp.completed({
              authorized: true,
              dapp,
              blockchainName: 'Cardano',
            }),
          );
        }
        return handleAuthorizeDappUI({
          dapp,
          windowId,
          selectOpenViews$,
          confirmConnect$,
          rejectConnect$,
          viewDisconnected$,
          locationChanged$,
          authorizeDapp,
          actions,
        });
      },
    ),
  );

/**
 * Resolves foreign transaction inputs using Blockfrost API when a signTx request is set.
 *
 * Listens for setSignTxRequest actions with non-null payloads and:
 * 1. Parses the transaction to extract input references
 * 2. Identifies which inputs are not in the local wallet's UTXOs (foreign inputs)
 * 3. Resolves foreign inputs via the Blockfrost API
 * 4. Stores the resolved addresses in Redux state for display
 *
 * @param actionObservables - Action observables including setPendingSignTxRequest$
 * @param stateObservables - State observables including selectAccountUtxos$ and selectChainId$
 * @param dependencies - Dependencies including actions and cardanoProvider
 * @returns Observable that emits Redux actions for resolved inputs
 */
export const resolveForeignTransactionInputs: SideEffect = (
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
 * Clears resolved transaction inputs when signTx request is cleared.
 */
export const clearResolvedInputsOnSignTxClear: SideEffect = (
  { cardanoDappConnector: { clearPendingSignTxRequest$ } },
  _,
  { actions },
) =>
  clearPendingSignTxRequest$.pipe(
    map(() => actions.cardanoDappConnector.clearResolvedTransactionInputs()),
  );

/**
 * Resolves a `closePopupRequested` action (carrying a popup location) into a
 * `views.closeView` dispatch by looking up the matching popupWindow view.
 */
export const closeRequestedPopup: SideEffect = (
  { cardanoDappConnector: { closePopupRequested$ } },
  { views: { selectOpenViews$ } },
  { actions },
) =>
  closePopupRequested$.pipe(
    withLatestFrom(selectOpenViews$),
    mergeMap(([{ payload: location }, openViews]) => {
      const popupView = openViews.find(
        view => view.type === 'popupWindow' && view.location === location,
      );
      return popupView ? of(actions.views.closeView(popupView.id)) : EMPTY;
    }),
  );

/**
 * Factory function to initialize extension-specific side effects.
 *
 * @returns Array of side effects to register with the store
 */
export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [
    connectCardanoDappConnectorApi,
    promptCardanoAuthorizeDapp,
    resolveForeignTransactionInputs,
    clearResolvedInputsOnSignTxClear,
    closeRequestedPopup,
  ];
};
