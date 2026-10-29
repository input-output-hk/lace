// The stable SDK build resolves this file in place of index.ts: the stable SDK
// carries none of the features the canary build adds, so every hook is empty.
// The exports and their types match index.ts.
import type { CardanoPaymentAddress } from '../types';
import type { CardanoWalletAccount } from '../util';
import type { Cardano } from '@cardano-sdk/core';
import type { ActivityType } from '@lace-contract/activities';
import type { FeatureFlag } from '@lace-contract/feature';
import type { TokenId } from '@lace-contract/tokens';

/** The account data of the account kinds the features add: none. */
export type ExtensionAccountProps = never;

/** The Cardano activity metadata the features add: none. */
export type ActivityExtensionMetadata = Record<never, never>;

/** What a feature's operation adds to the pending activity it derives: none. */
export type PendingActivityExtensionProps = Record<never, never>;

/** The activity metadata a pending activity carries for its feature: none. */
export const pendingActivityExtensionMetadata = (
  _props: PendingActivityExtensionProps,
): ActivityExtensionMetadata => ({});

/** A test for account tokens among the addresses: no token is one. */
export const isOwnAccountToken =
  (_accountAddresses: readonly CardanoPaymentAddress[]) =>
  (_tokenId: TokenId): boolean =>
    false;

/** A test for the account tokens of an account: no token is one. */
export const isAccountTokenOf =
  (_rewardAccount: Cardano.RewardAccount) =>
  (_assetId: Cardano.AssetId): boolean =>
    false;

/** Whether the activities the features classify apply: never, as there are none. */
export const isExtensionActivityFeatureEnabled = (
  _featureFlags: readonly FeatureFlag[],
): boolean => false;

/** The activity a feature classifies from the transaction body: none. */
export const classifyExtensionActivity = (
  _body: Pick<Cardano.HydratedTxBody, 'inputs' | 'mint' | 'outputs'>,
): { type: ActivityType; metadata: ActivityExtensionMetadata } | undefined =>
  undefined;

/** The reducers the features add to the store: none. */
export const extensionReducers = {};

/** The action creators the features add to the store: none. */
export const extensionActions = {};

/** The selectors the features add to the store: none. */
export const extensionSelectors = {};

const NO_ACCOUNT_IDS: ReadonlySet<string> = new Set();

/** The ids of the accounts whose UTxOs only their own builders spend: none. */
export const selectAccountIdsExcludedFromSpending = (): ReadonlySet<string> =>
  NO_ACCOUNT_IDS;

/** Whether a feature's own store tracks the account's tokens: never. */
export const isExtensionTokenAccount = (
  _account: CardanoWalletAccount,
): boolean => false;
