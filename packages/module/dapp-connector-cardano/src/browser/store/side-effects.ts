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
import { isHardwareWallet, WalletType } from '@lace-contract/wallet-repo';
import { deriveBip32PublicKey, hashEd25519PublicKey } from '@lace-lib/core';
import { HexBytes } from '@lace-lib/util';
import { mapHwSigningError } from '@lace-lib/util-hw';
import {
  concatMap,
  debounceTime,
  delay,
  EMPTY,
  filter,
  firstValueFrom,
  ignoreElements,
  map,
  merge,
  mergeMap,
  NEVER,
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
import { createChainedTxOutputCache } from '../../common/store/chained-tx-output-cache';
import { createPendingDappActivity } from '../../common/store/create-pending-dapp-activity';
import { createDeriveNextAddress } from '../../common/store/derive-next-address';
import { createResolveForeignInputsFlow } from '../../common/store/resolve-foreign-inputs';
import { transformToGroupedAddresses } from '../../common/store/util';
import {
  createCombinedInputResolver,
  requiresForeignSignaturesFromCbor,
} from '../../common/store/utils/input-resolver';
import {
  CARDANO_DAPP_CONNECT_LOCATION,
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../const';

import {
  detectViewClosure,
  findTargetSidePanel,
  signData$,
  signTx$,
  type SigningResult,
} from './util';

import type { ChainedTxOutputCache } from '../../common/store/chained-tx-output-cache';
import type {
  DeriveNextUnusedAddressFunction,
  SignTransactionFunction,
} from '../../common/store/dependencies/cardano-dapp-connector-api';
import type {
  CardanoConfirmationRequest,
  CardanoRequestType,
} from '../../common/store/dependencies/create-confirmation-callback';
import type {
  PendingSignDataRequest,
  PendingSignTxRequest,
} from '../../common/store/slice';
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
  CardanoProvider,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { ActionType } from '@lace-contract/module';
import type { LaceInitSync, ViewId } from '@lace-contract/module';
import type { SignerFactory } from '@lace-contract/signer';
import type { View, ViewLocation } from '@lace-contract/views';
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
 * Whether the account's signer threads witness native scripts into signature
 * detection. On desktop every signer except Ledger does (in-memory, Trezor,
 * Keystone, seed-signer), so script-required own keys are witnessable.
 */
const signerWitnessesScriptKeys = (wallet: AnyWallet): boolean =>
  wallet.type !== WalletType.HardwareLedger;

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
  /**
   * The ownership authority's first component: the signing account's full
   * settled UTxO set (collateral-reserved/unspendable INCLUDED), distinct
   * from `selectAvailableAccountUtxos$` above (the spendable view feeding
   * `resolutionUtxos`, unchanged).
   */
  selectCollateralOwnershipUtxos$: Observable<AccountUtxoMap>;
  /** Provider for resolving inputs absent from the local UTXO set */
  cardanoProvider: CardanoProvider;
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
  /** Outputs of recently signed/submitted txs, for chained-input resolution */
  chainedTxOutputCache: ChainedTxOutputCache;
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
  selectCollateralOwnershipUtxos$,
  cardanoProvider,
  getAccountIdForOrigin,
  signerFactory,
  accessAuthSecret,
  authenticate,
  signingResult$,
  chainedTxOutputCache,
}: CreateSignTransactionWrapperParams): SignTransactionFunction => {
  return async (
    txCbor: Cbor,
    partialSign: boolean,
    origin: string,
  ): Promise<Cbor> => {
    // Every exit from here must report a result. This runs only after the user
    // confirmed, so a flow is already waiting on signingResult$ — and if
    // nothing ever arrives that flow never completes, wedging every request
    // serialized behind it. The checks below all throw before the signing
    // try/catch that used to be the only reporting path.
    let hasReportedResult = false;
    const reportResult = (result: SigningResult) => {
      hasReportedResult = true;
      signingResult$.next(result);
    };
    try {
      const sessionAccountByOrigin = getAccountIdForOrigin();
      const accountId = sessionAccountByOrigin[origin];

      if (!accountId) {
        throw new APIError(
          APIErrorCode.AccountChange,
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
          APIErrorCode.AccountChange,
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
      const knownAddresses = transformToGroupedAddresses(
        allAddresses,
        accountId,
      );

      const availableAccountUtxos = await firstValueFrom(
        selectAvailableAccountUtxos$,
      );
      const localUtxos = availableAccountUtxos[accountId] ?? [];
      const chainedOwnUtxos = chainedTxOutputCache.resolveChainedInputs(
        txCbor,
        new Set<string>(knownAddresses.map(({ address }) => address)),
      );
      const resolutionUtxos = [...localUtxos, ...chainedOwnUtxos];

      // The local layer of the collateral resolver: the ownership authority, not
      // the available/spendable view `resolutionUtxos` uses -- that view
      // subtracts the collateral-reserved UTxOs this rule exists to catch. What
      // it lacks the provider resolves; what neither knows is not ours (LW-15506).
      const accountUtxos = await firstValueFrom(
        selectCollateralOwnershipUtxos$,
      );
      const ownershipUtxos = [
        ...(accountUtxos[accountId] ?? []),
        ...chainedOwnUtxos,
      ];

      const { extendedAccountPublicKey } = account.blockchainSpecific as {
        extendedAccountPublicKey: Bip32PublicKeyHex;
      };

      const dRepKeyHash = hashEd25519PublicKey(
        await deriveBip32PublicKey(extendedAccountPublicKey, KeyRole.DRep, 0),
      );

      if (
        !partialSign &&
        (await requiresForeignSignaturesFromCbor(
          txCbor,
          resolutionUtxos,
          knownAddresses,
          createCombinedInputResolver(resolutionUtxos, cardanoProvider, {
            chainId,
          }),
          signerWitnessesScriptKeys(wallet),
          dRepKeyHash,
        ))
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
        utxo: resolutionUtxos,
        collateralInputResolver: createCombinedInputResolver(
          ownershipUtxos,
          cardanoProvider,
          { chainId },
        ),
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
        chainedTxOutputCache.recordOwnTransaction(txCbor);
        // signingResult$ is consumed with take(1), so a reported success
        // cannot be taken back. Build before reporting, or a throwing build
        // leaves the popup showing success while the dApp's promise rejects.
        const witnessSet = buildCip30SignTxWitnessSet(
          Serialization.TxCBOR(txCbor),
          Serialization.TxCBOR(result.serializedTx),
        );
        reportResult({ type: 'success' });
        return witnessSet;
      } catch (error) {
        if (error instanceof AuthenticationCancelledError) {
          reportResult({ type: 'cancelled' });
        } else {
          const hwErrorKeys = isHardwareWallet(wallet)
            ? mapHwSigningError(error)
            : undefined;
          reportResult({ type: 'error', hwErrorKeys });
        }
        throw error;
      }
    } catch (postConsentError) {
      if (!hasReportedResult) reportResult({ type: 'error' });
      throw postConsentError;
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
    dappConnector: { selectAuthorizedDapps$ },
    cardanoContext: {
      selectChainId$,
      selectAvailableAccountUtxos$,
      selectCollateralOwnershipUtxos$,
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

  const chainedTxOutputCache = createChainedTxOutputCache();

  /**
   * Returns the tx id when the transaction is already on-chain, undefined
   * otherwise. Presence of the exact id proves an earlier submission of the
   * same signed tx succeeded, so a resubmission failure (e.g. after a replayed
   * call whose first execution landed) can be mapped to success without
   * classifying provider error shapes.
   */
  const landedTransactionId = async (
    cbor: string,
    chainId: Cardano.ChainId,
  ): Promise<string | undefined> => {
    try {
      const txId = Serialization.Transaction.fromCbor(
        Serialization.TxCBOR(cbor),
      ).getId();
      const details = await firstValueFrom(
        cardanoProvider.getTransactionDetails(txId, { chainId }),
      );
      return details.isOk() ? txId : undefined;
    } catch {
      return undefined;
    }
  };

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
    let transactionId: string;
    if (result.isOk()) {
      transactionId = result.value;
    } else {
      const landedId = await landedTransactionId(cbor, chainId);
      if (!landedId) throw result.error;
      transactionId = landedId;
    }
    chainedTxOutputCache.recordOwnTransaction(cbor);

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

    return transactionId;
  };

  const signTransactionWrapper = createSignTransactionWrapper({
    selectAllAddresses$,
    selectActiveNetworkAccounts$,
    selectAll$,
    selectChainId$,
    selectAvailableAccountUtxos$,
    selectCollateralOwnershipUtxos$,
    cardanoProvider,
    getAccountIdForOrigin: () => sessionAccountByOrigin,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
    chainedTxOutputCache,
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
    // The collateral-ownership authority: settled + own pending outputs.
    ownershipUtxos$: selectCollateralOwnershipUtxos$,
    accountUnspendableUtxos$: selectAccountUnspendableUtxos$,
    addresses$: selectAllAddresses$,
    accountTransactionHistory$: selectAccountTransactionHistory$,
    chainId$: selectChainId$,
    allAccounts$: selectActiveNetworkAccounts$,
    allWallets$: selectAll$,
    cardanoProvider,
    getAccountIdForOrigin: (origin: string) => sessionAccountByOrigin[origin],
    resolveChainedInputs: chainedTxOutputCache.resolveChainedInputs,
    signTransaction: signTransactionWrapper,
    submitTransaction,
    deriveNextUnusedAddress,
    signerFactory,
    accessAuthSecret,
    authenticate,
    signingResult$,
    // Do NOT gate on `isUnlocked$` here: opening the sign popup is what
    // surfaces the unlock prompt, since the sign routes mount the auth prompt
    // overlay (see ./addons/renderRoot.tsx). `lockState` lives only in
    // service-worker memory — the persist whitelist in
    // @lace-contract/app-lock carries `encryptedSentinel` and
    // `inactivityTimeout` only — so a worker Chrome suspended for idling
    // wakes up locked, and gating on unlock meant the request was swallowed
    // with no prompt, no approval and no rejection. Signing itself stays
    // gated: signTransactionWrapper builds its signer with
    // `signerAuthFromPrompt`, so the secret is still reached through the auth
    // prompt.
    handleRequests: request$ =>
      request$.pipe(
        // concatMap, not exhaustMap: exhaustMap DISCARDS a request that arrives
        // while another is in flight — never subscribed, never queued, its
        // resolve never called — so the dApp's promise could never settle.
        // concatMap serializes instead, draining in arrival order.
        //
        // Not mergeMap: the pending request is a single slot and both prompt
        // surfaces are shared, so two concurrent flows would overwrite each
        // other's request and show one prompt for two transactions.
        // Serializing is what keeps one prompt to one request.
        concatMap(request =>
          // The drop arm is listed FIRST on purpose. `disconnected$` replays a
          // drop that already happened, and a replayed value emits during
          // subscription — so ordering it ahead of the synchronous `proceed`
          // is what lets a request whose page died while queued lose the race
          // and be refused instead of opening a prompt for a dApp that is gone.
          race(
            (request.disconnected$ ?? NEVER).pipe(
              take(1),
              map(() => 'disconnected' as const),
            ),
            of('proceed' as const),
          ).pipe(
            switchMap(gate => {
              if (gate === 'disconnected') {
                // Nothing opened yet, so there is nothing to tear down — but
                // the queue must be freed and the dApp answered.
                request.resolve({ outcome: 'disconnected' });
                return EMPTY;
              }

              // Blocked requests take the same `signTx$` seam, so they inherit
              // this serialisation. That is load-bearing: a follow-up signTx an
              // attacker would use to repaint the refused screen away waits
              // behind it until the user dismisses it.
              if (isRequestOfType(request, 'signTx')) {
                return signTx$({
                  request,
                  selectOpenViews$,
                  actions,
                  confirmSignTx$,
                  rejectSignTx$,
                  viewDisconnected$,
                  signingResult$,
                  logger,
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
      // A refused request is never reviewed and renders no transaction value,
      // so its hostile CBOR must not drive provider input resolution either.
      filter(
        ({ payload }) => payload !== null && payload.collateralRefusal === null,
      ),
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
 * The request currently occupying `location`, if that location is one a
 * signing request can prompt at.
 */
const pendingRequestIdAt = (
  location: ViewLocation,
  pendingSignTxRequest: PendingSignTxRequest | null,
  pendingSignDataRequest: PendingSignDataRequest | null,
): string | undefined => {
  if (location === CARDANO_DAPP_SIGN_TX_LOCATION) {
    return pendingSignTxRequest?.requestId;
  }
  if (location === CARDANO_DAPP_SIGN_DATA_LOCATION) {
    return pendingSignDataRequest?.requestId;
  }
  return undefined;
};

/**
 * Resolves a `closePopupRequested` action into a `views.closeView` dispatch by
 * looking up the popupWindow view at the requested location.
 *
 * Skips the close when the location is occupied by a request other than the
 * one the closing view was showing. Queued requests share a window — opening a
 * popupWindow where one already stands just focuses it — so honouring such a
 * close destroys the prompt a successor has already inherited, and the
 * view-closure arm answers that successor "user rejected" unseen.
 */
export const closeRequestedPopup: SideEffect = (
  { cardanoDappConnector: { closePopupRequested$ } },
  {
    views: { selectOpenViews$ },
    cardanoDappConnector: {
      selectPendingSignTxRequest$,
      selectPendingSignDataRequest$,
    },
  },
  { actions },
) =>
  closePopupRequested$.pipe(
    // Decide one task late: the action that publishes the next request reaches
    // the store a task after the queue binds it (`toEpic` delays every side
    // effect), so an arrival-time read would still name the cancelled request.
    delay(0),
    withLatestFrom(
      selectOpenViews$,
      selectPendingSignTxRequest$,
      selectPendingSignDataRequest$,
    ),
    mergeMap(
      ([
        {
          payload: { location, requestId },
        },
        openViews,
        pendingSignTxRequest,
        pendingSignDataRequest,
      ]) => {
        const occupant = pendingRequestIdAt(
          location,
          pendingSignTxRequest,
          pendingSignDataRequest,
        );
        if (
          requestId !== undefined &&
          occupant !== undefined &&
          occupant !== requestId
        ) {
          return EMPTY;
        }
        const popupView = openViews.find(
          view => view.type === 'popupWindow' && view.location === location,
        );
        return popupView ? of(actions.views.closeView(popupView.id)) : EMPTY;
      },
    ),
  );

/**
 * Resolves a `closeSheetRequested` action into the `views.setActiveSheetPage`
 * that dismisses the sign sheet.
 *
 * Dismisses only while the sheet still presents the request that asked. Every
 * sheet shares one `activeSheetPage` slot with last-write-wins, and a view's
 * close reaches the store independently of the answer that frees the queue, so
 * a close can arrive once the slot has moved on. Honouring it then would take
 * the prompt from whatever now holds the sheet — a queued request, or an
 * unrelated sheet such as AuthorizeDapp — leaving that one unanswerable.
 *
 * The slot's own `requestId` is the discriminator, NOT the pending request:
 * `openDappSheet` publishes a pending request whichever surface it chose, so a
 * successor served as a popup window would otherwise look like the occupant of
 * a sheet it never took, and that sheet would be left presented with nothing
 * able to dismiss it.
 */
export const closeRequestedSheet: SideEffect = (
  { cardanoDappConnector: { closeSheetRequested$ } },
  { views: { getActiveSheetPage$ } },
  { actions },
) =>
  closeSheetRequested$.pipe(
    // One task late, as closeRequestedPopup is. Every side effect's output is
    // itself deferred (toEpic), so reading on arrival would let this dismissal
    // land AFTER the successor's own setActiveSheetPage and leave that request
    // with no sheet at all.
    delay(0),
    withLatestFrom(getActiveSheetPage$),
    mergeMap(
      ([
        {
          payload: { requestId },
        },
        activeSheetPage,
      ]) => {
        // The sheet's own requestId is in its route params. Not the slot's
        // top-level `requestId` (views' Page): that one is a number, stamped
        // to defeat state-replica de-duplication.
        const presentedRequestId = (
          activeSheetPage?.params as { requestId?: string } | undefined
        )?.requestId;
        if (
          presentedRequestId === undefined ||
          presentedRequestId !== requestId
        ) {
          return EMPTY;
        }
        return of(actions.views.setActiveSheetPage(null));
      },
    ),
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
    closeRequestedSheet,
  ];
};
