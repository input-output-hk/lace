import * as Crypto from '@cardano-sdk/crypto';
import { emip3encrypt, util } from '@cardano-sdk/key-management';
import { createSecureStorePasswordManager } from '@lace-contract/authentication-prompt';
import {
  type AnyWallet,
  type HardwareWallet,
  type InMemoryWallet,
  WalletId,
  WalletType,
  isTrezorWallet,
} from '@lace-contract/wallet-repo';
import { classifyHardwareError, DeviceDescriptor } from '@lace-lib/util-hw';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import {
  defer,
  filter,
  map,
  merge,
  of,
  switchMap,
  catchError,
  from,
  withLatestFrom,
  EMPTY,
  mergeMap,
  take,
  concat,
} from 'rxjs';

import {
  generateUniqueAccountName,
  getAllAccountNames,
  isDuplicateString,
} from '../utils';

import type { SideEffect } from '..';
import type { AddInMemoryWalletAccountProps } from './slice';
import type { HexBlob } from '@cardano-sdk/util';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { LaceInit, State } from '@lace-contract/module';
import type {
  AddHwWalletAccountProps,
  CreateHardwareWalletProps,
  HwWalletConnector,
} from '@lace-contract/onboarding-v2';
import type {
  HardwareWalletAccount,
  WalletEntity,
} from '@lace-contract/wallet-repo';
import type { SheetRoutes, StackRoutes, TabRoutes } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Action } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const AddedAccountSuccessRoute: `${SheetRoutes}` = 'AddedAccountSuccess';
const AddedAccountFailedRoute: `${SheetRoutes}` = 'AddedAccountFailed';
const RestoreWalletSuccessRoute: `${SheetRoutes}` = 'RestoreWalletSuccess';
const SuccessCreateNewWalletRoute: `${SheetRoutes}` = 'SuccessCreateNewWallet';
const RemoveWalletSuccessRoute: `${SheetRoutes}` = 'RemoveWalletSuccess';
const RemoveAccountSuccessRoute: `${SheetRoutes}` = 'RemoveAccountSuccess';
const OnboardingStartRoute: `${StackRoutes}` = 'OnboardingStart';
const HomeRoute: `${StackRoutes}` = 'Home';
const AccountCenterTab: `${TabRoutes}` = 'Accounts';

/**
 * Inputs for locating a target in-memory wallet.
 */
type PickWalletProps = {
  wallets: AnyWallet[];
  walletId: WalletId;
  logger: Logger;
};

const conditionalFailure = <A extends Action>(
  shouldSuppress: boolean,
  failureAction: A,
): Observable<A> => {
  return shouldSuppress ? (EMPTY as Observable<A>) : of(failureAction);
};

// This is now done in the current onboarding in a util file
// When we have the new onboarding, we can move to a separate contract
// and use it in the modules required
const computeWalletId = (recoveryPhrase: string[]): WalletId => {
  const phrase = util.joinMnemonicWords(recoveryPhrase);
  const phraseHex = Buffer.from(phrase, 'utf8').toString('hex') as HexBlob;

  const BYTES_MIN = 16;
  const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    phraseHex,
    BYTES_MIN,
  );

  const walletIdHex = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    digest as HexBlob,
    BYTES_MIN,
  );

  return WalletId(walletIdHex);
};

const encryptRecoveryPhrase = async (
  recoveryPhrase: string[],
  password: AuthSecret,
) => {
  const walletEncrypted = await emip3encrypt(
    ByteArray.fromUTF8(util.joinMnemonicWords(recoveryPhrase)),
    password,
  );
  return HexBytes.fromByteArray(ByteArray(walletEncrypted));
};

const createWalletEntity = async ({
  walletName,
  blockchains,
  password,
  order,
  integrations,
  logger,
  recoveryPhrase: providedRecoveryPhrase,
  existingAccountNames,
}: {
  walletName: string;
  blockchains: BlockchainName[];
  password: AuthSecret;
  order: number;
  integrations: InMemoryWalletIntegration[];
  logger: Logger;
  recoveryPhrase?: string[];
  existingAccountNames?: string[];
}) => {
  const uniqueBlockchains = Array.from(new Set(blockchains));

  const selectedIntegrations = integrations.filter(integration =>
    uniqueBlockchains.includes(integration.blockchainName),
  );

  if (selectedIntegrations.length === 0) {
    throw new Error(
      'No wallet integrations available for selected blockchains',
    );
  }

  const isRecoveryFlow =
    Array.isArray(providedRecoveryPhrase) && providedRecoveryPhrase.length > 0;
  const recoveryPhrase = isRecoveryFlow
    ? [...providedRecoveryPhrase]
    : util.generateMnemonicWords();
  const walletId = computeWalletId(recoveryPhrase);
  const encryptedRecoveryPhrase = await encryptRecoveryPhrase(
    recoveryPhrase,
    password,
  );

  const results = await Promise.all(
    selectedIntegrations.map(async integration => {
      const result = await integration.initializeWallet(
        {
          walletId,
          recoveryPhrase,
          password,
          walletName,
          order,
        },
        { logger },
      );
      return { ...result, blockchainName: integration.blockchainName };
    }),
  );

  // Deduplicate auto-generated account names against existing names.
  // Each integration result may contain multiple accounts (one per network
  // variant, e.g. Midnight mainnet/testnet/devnet). All accounts from the
  // same integration share the same logical name, so we deduplicate once
  // per integration result rather than once per account.
  const usedNames = [...(existingAccountNames ?? [])];
  for (const result of results) {
    if (result.accounts.length === 0) continue;
    const sharedName = result.accounts[0].metadata.name;
    let finalName = sharedName;
    if (isDuplicateString(sharedName, usedNames)) {
      finalName = generateUniqueAccountName(result.blockchainName, usedNames);
      for (const account of result.accounts) {
        account.metadata.name = finalName;
      }
    }
    usedNames.push(finalName);
  }

  const accounts = results.flatMap(result => result.accounts);

  const blockchainSpecific = results.reduce(
    (accumulator, result) =>
      result.blockchainSpecificWalletData
        ? {
            ...accumulator,
            [result.blockchainName]: result.blockchainSpecificWalletData,
          }
        : accumulator,
    {} as Record<BlockchainName, unknown>,
  );

  return {
    walletId,
    encryptedRecoveryPhrase,
    metadata: { name: walletName, order },
    type: WalletType.InMemory,
    accounts,
    blockchainSpecific,
    isPassphraseConfirmed: isRecoveryFlow,
  } as InMemoryWallet;
};

/**
 * Finds the target in-memory wallet by `walletId`.
 *
 * @param props - Lookup arguments.
 * @param props.wallets - All wallets from state.
 * @param props.walletId - ID of the wallet to find.
 * @param props.logger - Logger used to report lookup failures.
 * @returns The matching `InMemoryWallet` or `null` if not found.
 */
const pickWallet = ({
  wallets,
  walletId,
  logger,
}: PickWalletProps): InMemoryWallet | null => {
  const wallet = wallets.find(
    (w): w is InMemoryWallet =>
      w.walletId === walletId && w.type === WalletType.InMemory,
  );
  if (!wallet) {
    logger.warn('Wallet not found for adding account', { walletId });
    return null;
  }
  return wallet;
};

/**
 * Context for adding an account to an in-memory wallet.
 */
type AddAccountContext = {
  wallet: InMemoryWallet;
  blockchain: BlockchainName;
  accountIndex: number;
  authenticationPromptConfig: AddInMemoryWalletAccountProps['authenticationPromptConfig'];
  accountName?: string;
  shouldSuppressAccountStatus?: boolean;
};

/**
 * Creates the side effect that handles adding a new account to an in-memory wallet.
 *
 * Flow:
 * 1) Listens to `accountManagement.attemptAddInMemoryWalletAccount$`
 * 2) Resolves the target wallet from `wallets.selectAll$`
 * 3) Triggers an auth prompt and only proceeds on confirmation
 * 4) Calls `integration.addAccount` which handles both existing and new blockchains
 * 5) Dispatches `wallets.updateWallet` with the appended account
 * 6) On failure, dispatches `accountManagement.attemptAddAccountFailed`
 *
 * @param inMemoryWalletIntegrations - Available blockchain integrations for creating accounts.
 */
export const createInMemoryWalletAddAccountSideEffect =
  (inMemoryWalletIntegrations: InMemoryWalletIntegration[]): SideEffect =>
  (
    { accountManagement: { attemptAddInMemoryWalletAccount$ } },
    { wallets: { selectAll$ } },
    { actions, authenticate, accessAuthSecret, logger },
  ) => {
    return attemptAddInMemoryWalletAccount$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([action, wallets]) => {
        const {
          walletId,
          blockchain,
          accountIndex,
          authenticationPromptConfig,
          accountName,
          shouldSuppressAccountStatus,
          targetNetworks,
        } = action.payload;

        const wallet = pickWallet({ wallets, walletId, logger });

        if (!wallet) {
          return EMPTY;
        }

        const integration = inMemoryWalletIntegrations.find(
          walletIntegration => walletIntegration.blockchainName === blockchain,
        );

        if (!integration) {
          logger.error('No integration found for blockchain', { blockchain });
          return conditionalFailure(
            !!shouldSuppressAccountStatus,
            actions.accountManagement.attemptAddAccountFailed({ walletId }),
          );
        }

        const context: AddAccountContext = {
          wallet,
          blockchain,
          accountIndex,
          authenticationPromptConfig,
          accountName,
          shouldSuppressAccountStatus,
        };

        const accountAddition$ = authenticate(
          context.authenticationPromptConfig,
        ).pipe(
          switchMap(confirmed => {
            if (!confirmed) {
              return of(actions.accountManagement.setLoading(false));
            }

            return accessAuthSecret(password =>
              from(
                integration.addAccounts(
                  {
                    wallet,
                    accountIndex,
                    password,
                    accountName: context.accountName,
                    targetNetworks,
                  },
                  { logger },
                ),
              ),
            ).pipe(
              mergeMap(result => {
                const { wallet: updatedWallet } = result;

                // Calculate new accounts by comparing with original wallet
                const newAccountsCount =
                  updatedWallet.accounts.length - wallet.accounts.length;

                if (newAccountsCount === 0) {
                  throw new Error('No new accounts created');
                }

                return from([
                  actions.wallets.updateWallet({
                    id: wallet.walletId,
                    changes: {
                      accounts: updatedWallet.accounts,
                      blockchainSpecific: updatedWallet.blockchainSpecific,
                    },
                  }),
                  actions.accountManagement.accountAdded({
                    walletId: wallet.walletId,
                    blockchain: context.blockchain,
                    accountIndex: context.accountIndex,
                    shouldSuppressAccountStatus:
                      context.shouldSuppressAccountStatus,
                  }),
                ]);
              }),
              catchError((error: unknown) => {
                logger.error('Failed to add account', {
                  walletId: context.wallet.walletId,
                  blockchain: context.blockchain,
                  error,
                });
                return conditionalFailure(
                  !!context.shouldSuppressAccountStatus,
                  actions.accountManagement.attemptAddAccountFailed({
                    walletId: context.wallet.walletId,
                  }),
                );
              }),
            );
          }),
        );
        return accountAddition$;
      }),
    );
  };

/** Promise-based {@link HwWalletConnector} with async methods wrapped to return Observables. */
type ObservableHwWalletConnector = Pick<
  HwWalletConnector,
  'id' | 'walletType'
> & {
  connectAccount: (
    state: State,
    props: AddHwWalletAccountProps,
  ) => Observable<HardwareWalletAccount[]>;
  createWallet: (
    state: State,
    props: CreateHardwareWalletProps,
  ) => Observable<WalletEntity>;
};

/**
 * Creates the side effect that handles adding accounts to any wallet type.
 * Branches by wallet type:
 * - InMemory → dispatches `attemptAddInMemoryWalletAccount` (auth prompt handled there)
 * - HW (Ledger/Trezor) → parses device, finds connector, calls `connectAccount` inline
 * - MultiSig → not yet implemented
 */
export const createAddAccountSideEffect =
  (hwConnectors: ObservableHwWalletConnector[]): SideEffect =>
  (
    { accountManagement: { attemptAddAccount$ } },
    { wallets: { selectAll$ } },
    { actions, logger, __getState },
  ) =>
    attemptAddAccount$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([action, wallets]) => {
        const {
          walletId,
          blockchain,
          accountIndex,
          authenticationPromptConfig,
          accountName,
          shouldSuppressAccountStatus,
          targetNetworks,
        } = action.payload;

        const wallet = wallets.find(w => w.walletId === walletId);

        if (!wallet) {
          logger.warn('Wallet not found for adding account', { walletId });
          return conditionalFailure(
            !!shouldSuppressAccountStatus,
            actions.accountManagement.attemptAddAccountFailed({ walletId }),
          );
        }

        switch (wallet.type) {
          case WalletType.InMemory:
            return of(
              actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain,
                accountIndex,
                authenticationPromptConfig: authenticationPromptConfig!,
                accountName,
                shouldSuppressAccountStatus,
                targetNetworks,
              }),
            );

          case WalletType.HardwareLedger:
          case WalletType.HardwareTrezor: {
            // Parse device from usb-hw-* wallet ID. Null for v1 wallets
            // with legacy ID format — the HW connector resolves those
            // from navigator.usb.getDevices().
            const device = DeviceDescriptor.parse(walletId) ?? undefined;

            const connector = hwConnectors.find(
              c => c.walletType === wallet.type,
            );

            if (!connector) {
              logger.error('No HW wallet connector found for wallet type', {
                walletId,
                walletType: wallet.type,
              });
              return of(
                actions.accountManagement.attemptAddAccountFailed({ walletId }),
              );
            }

            // Infer derivationType from existing Trezor wallet metadata
            const derivationType = isTrezorWallet(wallet)
              ? wallet.metadata.derivationType
              : undefined;

            return connector
              .connectAccount(__getState(), {
                walletId,
                blockchainName: blockchain,
                device,
                accountIndex,
                accountName,
                derivationType,
                targetNetworks,
              })
              .pipe(
                mergeMap(newAccounts =>
                  from([
                    actions.wallets.updateWallet({
                      id: walletId,
                      changes: {
                        accounts: [...wallet.accounts, ...newAccounts],
                      } as Partial<HardwareWallet>,
                    }),
                    actions.accountManagement.accountAdded({
                      walletId,
                      blockchain,
                      accountIndex,
                    }),
                  ]),
                ),
                catchError((error: unknown) => {
                  const hwErrorCategory = classifyHardwareError(error);
                  logger.warn('Failed to add HW account', {
                    walletId,
                    blockchain,
                    hwErrorCategory,
                    error,
                  });
                  return of(
                    actions.accountManagement.attemptAddAccountFailed({
                      walletId,
                      errorTitle: `hw-error.${hwErrorCategory}.title`,
                      errorDescription: `hw-error.${hwErrorCategory}.subtitle`,
                    }),
                  );
                }),
              );
          }

          case WalletType.MultiSig:
            // TODO: Implement multi-sig wallet account addition if needed
            logger.warn(
              'Multi-sig wallet account addition not yet implemented',
              {
                walletId,
              },
            );
            return conditionalFailure(
              !!shouldSuppressAccountStatus,
              actions.accountManagement.attemptAddAccountFailed({ walletId }),
            );

          default:
            logger.error('Unknown wallet type for adding account', {
              walletId,
            });
            return conditionalFailure(
              !!shouldSuppressAccountStatus,
              actions.accountManagement.attemptAddAccountFailed({ walletId }),
            );
        }
      }),
    );

/**
 * Creates the side effect that automatically shows the success sheet when an account is added.
 *
 * Flow:
 * 1) Listens to `accountManagement.accountAdded$`
 * 2) Dispatches `views.setActiveSheetPage` with `AddedAccountSuccessRoute`
 */
export const createAccountAddedSuccessSheetSideEffect: SideEffect = (
  { accountManagement: { accountAdded$ } },
  _,
  { actions },
) =>
  accountAdded$.pipe(
    filter(action => !action.payload.shouldSuppressAccountStatus),
    map(() =>
      actions.views.setActiveSheetPage({
        route: AddedAccountSuccessRoute,
      }),
    ),
  );

/**
 * Creates the side effect that automatically shows the failure sheet when account addition fails.
 *
 * Flow:
 * 1) Listens to `accountManagement.attemptAddAccountFailed$`
 * 2) Dispatches `views.setActiveSheetPage` with `AddedAccountFailedRoute`
 */
export const createAccountAddFailedSheetSideEffect: SideEffect = (
  { accountManagement: { attemptAddAccountFailed$ } },
  _,
  { actions },
) =>
  attemptAddAccountFailed$.pipe(
    map(() =>
      actions.views.setActiveSheetPage({
        route: AddedAccountFailedRoute,
      }),
    ),
  );

/**
 * Creates the side effect that handles creating a new hardware wallet from the
 * in-app account management flow (i.e. when the user already has a wallet).
 *
 * Flow:
 * 1) Listens to `accountManagement.attemptCreateHardwareWallet$`
 * 2) Picks the HW connector matching `payload.optionId`
 * 3) Dispatches `accountManagement.setLoading(true)` while the connector builds
 *    the wallet entity via the service worker
 * 4) On success: dispatches `wallets.addWallet` with order set to the current
 *    wallet count, clears loading, and navigates to `SuccessCreateNewWallet`
 * 5) On failure: dispatches `accountManagement.hardwareWalletCreationFailed`
 *    with the classified {@link HardwareErrorCategory}
 *
 * Unlike the onboarding flow, this side effect does not bootstrap the app lock
 * or use any pending password — the user is already authenticated.
 */
export const createHardwareWalletCreationSideEffect =
  (hwConnectors: ObservableHwWalletConnector[]): SideEffect =>
  (
    { accountManagement: { attemptCreateHardwareWallet$ } },
    { wallets: { selectAll$ } },
    { actions, logger, __getState },
  ) =>
    attemptCreateHardwareWallet$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([{ payload }, wallets]) => {
        const connector = hwConnectors.find(c => c.id === payload.optionId);
        if (!connector) {
          logger.error(
            `Hardware wallet connector not found for ${payload.optionId}`,
          );
          return of(
            actions.accountManagement.hardwareWalletCreationFailed({
              reason: 'generic',
            }),
          );
        }

        return concat(
          of(actions.accountManagement.setLoading(true)),
          connector
            .createWallet(__getState(), {
              blockchainName: payload.blockchainName,
              device: payload.device,
              accountIndex: payload.accountIndex,
              derivationType: payload.derivationType,
            })
            .pipe(
              mergeMap(entity =>
                from([
                  actions.wallets.addWallet({
                    ...entity,
                    metadata: { ...entity.metadata, order: wallets.length },
                  }),
                  actions.accountManagement.setLoading(false),
                  actions.views.setActiveSheetPage({
                    route: SuccessCreateNewWalletRoute,
                    params: { walletId: entity.walletId },
                  }),
                ]),
              ),
              catchError(error => {
                const category = classifyHardwareError(error);
                const message = `Hardware wallet creation failed: ${category}`;
                if (category === 'generic') {
                  logger.error(message, error);
                } else {
                  logger.warn(message, error);
                }
                return of(
                  actions.accountManagement.hardwareWalletCreationFailed({
                    reason: category,
                  }),
                );
              }),
            ),
        );
      }),
    );

export const createWalletCreationSideEffect =
  (inMemoryWalletIntegrations: InMemoryWalletIntegration[]): SideEffect =>
  (
    { accountManagement: { attemptCreateWallet$ } },
    { wallets: { selectAll$ } },
    { actions, logger, authenticate, accessAuthSecret },
  ) => {
    return attemptCreateWallet$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([action, wallets]) => {
        const { walletName, blockchains, recoveryPhrase } = action.payload;

        const trimmedName = walletName.trim();
        if (!trimmedName || blockchains.length === 0) {
          return EMPTY;
        }

        const isRecoveryFlow =
          Array.isArray(recoveryPhrase) && recoveryPhrase.length > 0;
        const order = wallets.length;

        if (order === 0) {
          return of(
            actions.views.setActivePage({
              route: OnboardingStartRoute,
              params: undefined,
            }),
          );
        }

        return authenticate({
          cancellable: true,
          confirmButtonLabel:
            'authentication-prompt.confirm-button-label.create-wallet',
          message: 'authentication-prompt.message.create-wallet',
        }).pipe(
          filter(Boolean),
          switchMap(() =>
            concat(
              of(actions.accountManagement.setLoading(true)),
              accessAuthSecret(authSecret =>
                from(
                  createWalletEntity({
                    walletName: trimmedName,
                    blockchains,
                    password: authSecret,
                    order,
                    integrations: inMemoryWalletIntegrations,
                    logger,
                    recoveryPhrase,
                    existingAccountNames: getAllAccountNames(wallets),
                  }),
                ),
              ).pipe(
                mergeMap(newWallet => {
                  const successRoute = isRecoveryFlow
                    ? RestoreWalletSuccessRoute
                    : SuccessCreateNewWalletRoute;
                  return from([
                    actions.wallets.addWallet(newWallet),
                    actions.accountManagement.setLoading(false),
                    actions.views.setActiveSheetPage({
                      route: successRoute,
                      params: { walletId: newWallet.walletId },
                    }),
                  ]);
                }),
                catchError(error => {
                  logger.error('Failed to create wallet', error);
                  return of(actions.accountManagement.setLoading(false));
                }),
              ),
            ),
          ),
        );
      }),
    );
  };

/**
 * Creates the side effect that validates authentication before removing a wallet.
 *
 * Flow:
 * 1) Listens to `accountManagement.attemptRemoveWallet$`
 * 2) Triggers the authentication prompt and waits for confirmation
 * 3) Accesses the auth secret to validate the password (result ignored)
 * 4) Dispatches `wallets.removeWallet` with the wallet's account ids when the
 *    wallet exists in state; otherwise completes without dispatching.
 */
export const createRemoveWalletSideEffect: SideEffect = (
  { accountManagement: { attemptRemoveWallet$ } },
  { wallets: { selectAll$ } },
  { actions, authenticate, logger },
) => {
  return attemptRemoveWallet$.pipe(
    switchMap(({ payload }) =>
      authenticate(payload.authenticationPromptConfig).pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        mergeMap(() =>
          selectAll$.pipe(
            take(1),
            mergeMap(wallets => {
              const { walletId } = payload;
              const wallet = wallets.find(w => w.walletId === walletId);
              if (!wallet) return EMPTY;
              const accountIds = wallet.accounts.map(a => a.accountId);
              return of(actions.wallets.removeWallet(walletId, accountIds));
            }),
          ),
        ),
        catchError(error => {
          logger.error('Failed to remove wallet after auth prompt', error);
          return EMPTY;
        }),
      ),
    ),
  );
};

/**
 * Runs after `wallets.removeWallet`: navigates to Home + success sheet when other
 * wallets remain; otherwise clears the stored password (when available) and
 * navigates to onboarding start.
 */
export const createRemoveWalletNavigationSideEffect: SideEffect = (
  { wallets: { removeWallet$ } },
  { wallets: { selectAll$ } },
  { actions, logger, secureStore },
) =>
  removeWallet$.pipe(
    withLatestFrom(selectAll$),
    mergeMap(([, wallets]) => {
      if (wallets.length > 0) {
        return from([
          actions.views.setActivePage({
            route: HomeRoute,
            params: { screen: AccountCenterTab },
          }),
          actions.views.setActiveSheetPage({ route: RemoveWalletSuccessRoute }),
        ]);
      }

      return from(
        (async () => {
          try {
            if (await secureStore.isAvailableAsync()) {
              const passwordManager =
                createSecureStorePasswordManager(secureStore);
              await passwordManager.deletePassword();
              logger.debug(
                'Cleared password from secure storage after removing last wallet',
              );
            }
          } catch (error) {
            logger.warn('Failed to clear password from secure storage', error);
          }
          return actions.views.setActivePage({ route: OnboardingStartRoute });
        })(),
      );
    }),
  );

/**
 * Creates the side effect that validates authentication before removing an account.
 *
 * Flow:
 * 1) Listens to `accountManagement.attemptRemoveAccount$`
 * 2) Triggers the authentication prompt and waits for confirmation
 * 3) Accesses the auth secret to validate the password (result ignored)
 * 4) Dispatches `wallets.removeWallet` with every account id when the wallet
 *    has exactly one mainnet account; otherwise dispatches `wallets.removeAccount`
 *    for the requested account. If the wallet is missing from state, completes
 *    without dispatching wallet actions.
 */
export const createRemoveAccountSideEffect: SideEffect = (
  { accountManagement: { attemptRemoveAccount$ } },
  { wallets: { selectAll$ } },
  { actions, authenticate, logger },
) => {
  return attemptRemoveAccount$.pipe(
    switchMap(({ payload }) =>
      authenticate(payload.authenticationPromptConfig).pipe(
        filter((confirmed): confirmed is true => confirmed === true),
        withLatestFrom(selectAll$),
        mergeMap(([, wallets]) => {
          const { walletId, accountId } = payload;
          const wallet = wallets.find(w => w.walletId === walletId);
          if (!wallet) return EMPTY;
          const { accounts } = wallet;
          const mainnetAccounts = accounts.filter(
            a => a.networkType === 'mainnet',
          );
          const shouldRemoveWallet =
            mainnetAccounts.length === 1 &&
            mainnetAccounts[0].accountId === accountId;

          return of(
            shouldRemoveWallet
              ? actions.wallets.removeWallet(
                  walletId,
                  accounts.map(account => account.accountId),
                )
              : actions.wallets.removeAccount(walletId, accountId),
          );
        }),
        catchError(error => {
          logger.error('Failed to remove account after auth prompt', error);
          return EMPTY;
        }),
      ),
    ),
  );
};

/**
 * Creates the side effect that navigates back to Account Center and opens the RemoveAccountSuccess sheet when removing an account.
 *
 * Flow:
 * 1) Listens to `wallets.removeAccount$`
 * 2) Navigates to `HomeRoute` focused on the Account Center tab
 * 3) Opens the RemoveAccountSuccess sheet
 */
export const createRemoveAccountNavigationSideEffect: SideEffect = (
  { wallets: { removeAccount$ } },
  _stateObservables,
  { actions },
) =>
  removeAccount$.pipe(
    mergeMap(() =>
      from([
        actions.views.setActivePage({
          route: HomeRoute,
          params: { screen: AccountCenterTab },
        }),
        actions.views.setActiveSheetPage({
          route: RemoveAccountSuccessRoute,
        }),
      ]),
    ),
  );

/**
 * Initializes all side effects for this module.
 *
 * - Loads in-memory wallet integrations and HW onboarding options
 * - Returns an array with a single composed side effect that merges its internal streams
 *
 * @param loadModules - Function to load plugin/module providers by token.
 * @returns Array of `SideEffect` ready to be registered.
 */
export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const inMemoryWalletIntegrations = await loadModules(
    'addons.loadInMemoryWalletIntegration',
  );

  const hwConnectors =
    (await loadModules('addons.loadHwWalletConnector')) ?? [];
  const observableHwConnectors: ObservableHwWalletConnector[] =
    hwConnectors.map(c => ({
      id: c.id,
      walletType: c.walletType,
      connectAccount: (state, props) =>
        defer(() => from(c.connectAccount(state, props))),
      createWallet: (state, props) =>
        defer(() => from(c.createWallet(state, props))),
    }));

  return [
    (actionObservables, stateObservables, dependencies) => {
      return merge(
        ...[
          createInMemoryWalletAddAccountSideEffect(inMemoryWalletIntegrations),
          createAddAccountSideEffect(observableHwConnectors),
          createAccountAddedSuccessSheetSideEffect,
          createAccountAddFailedSheetSideEffect,
          createRemoveAccountSideEffect,
          createRemoveAccountNavigationSideEffect,
          createWalletCreationSideEffect(inMemoryWalletIntegrations),
          createHardwareWalletCreationSideEffect(observableHwConnectors),
          createRemoveWalletSideEffect,
          createRemoveWalletNavigationSideEffect,
        ].map(sideEffect =>
          sideEffect(actionObservables, stateObservables, dependencies),
        ),
      );
    },
  ];
};
