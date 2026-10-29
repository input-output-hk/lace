// How the custody account and cNIGHT designation features hook into the
// Cardano context: the account kind, the activity mapping and the store. The
// stable SDK build resolves index.stable.ts instead, which hooks neither, so
// the stable SDK carries neither feature's state, code or types.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { ActivityType } from '@lace-contract/activities';

import { isCardanoCustodyAccount } from '../custody/account';
import { isCardanoCustodyAccountTokenOf } from '../custody/account-token';
import { FEATURE_FLAG_CNIGHT_DESIGNATION } from '../night-designation-feature-flag';
import { classifyTxAsNightDesignation } from '../store/helpers/night-designation-script-addresses';
import {
  nightDesignationFlowActions,
  nightDesignationFlowReducers,
  nightDesignationFlowSelectors,
} from '../store/night-designation-flow';
import {
  nightDesignationIndexActions,
  nightDesignationIndexReducers,
  nightDesignationIndexSelectors,
} from '../store/night-designation-index';

import { selectCustodyAccountIds } from './custody-account-ids';
import { isOwnCustodyAccountToken } from './custody-account-tokens-of-addresses';

import type { CardanoNightDesignationActivityMetadata } from '../augmentations';
import type { CardanoCustodyActivityMetadata } from '../custody/pending-operation';
import type { CardanoCustodyAccountProps } from '../types';
import type { CardanoWalletAccount } from '../util';
import type { Cardano } from '@cardano-sdk/core';
import type { FeatureFlag } from '@lace-contract/feature';

/** The account data of the account kinds the features add: custody accounts. */
export type ExtensionAccountProps = CardanoCustodyAccountProps;

/** The Cardano activity metadata the features add. */
export type ActivityExtensionMetadata = {
  nightDesignation?: CardanoNightDesignationActivityMetadata;
  custody?: CardanoCustodyActivityMetadata;
};

/** What a feature's operation adds to the pending activity it derives. */
export type PendingActivityExtensionProps = {
  /** Set for a custody operation, so a stale activity can be dropped. */
  custody?: CardanoCustodyActivityMetadata;
};

/** The activity metadata a pending activity carries for its feature. */
export const pendingActivityExtensionMetadata = ({
  custody,
}: PendingActivityExtensionProps): ActivityExtensionMetadata =>
  custody ? { custody } : {};

/**
 * A test for the account tokens of the custody accounts among the addresses:
 * tokens that only mark an account's own UTxOs and are no holding.
 */
export const isOwnAccountToken = isOwnCustodyAccountToken;

/** A test for the account tokens of the account that owns `rewardAccount`. */
export const isAccountTokenOf = isCardanoCustodyAccountTokenOf;

/**
 * Whether the activities the features classify apply: while the cNIGHT
 * designation feature is on.
 */
export const isExtensionActivityFeatureEnabled = (
  featureFlags: readonly FeatureFlag[],
): boolean =>
  featureFlags.some(flag => flag.key === FEATURE_FLAG_CNIGHT_DESIGNATION);

/**
 * The type and metadata of an activity a feature classifies from the
 * transaction body alone: a cNIGHT designation, matched by its script
 * addresses.
 */
export const classifyExtensionActivity = (
  body: Pick<Cardano.HydratedTxBody, 'inputs' | 'mint' | 'outputs'>,
): { type: ActivityType; metadata: ActivityExtensionMetadata } | undefined => {
  const nightDesignation = classifyTxAsNightDesignation(
    body.inputs,
    body.outputs,
    body.mint,
  );
  return nightDesignation
    ? {
        type: ActivityType.NightDesignation,
        metadata: { nightDesignation: { action: nightDesignation.action } },
      }
    : undefined;
};

/** The reducers the features add to the store. */
export const extensionReducers = {
  ...nightDesignationFlowReducers,
  ...nightDesignationIndexReducers,
};

/** The action creators the features add to the store, by scope. */
export const extensionActions = {
  ...nightDesignationFlowActions,
  ...nightDesignationIndexActions,
};

/** The selectors the features add to the store, by scope. */
export const extensionSelectors = {
  ...nightDesignationFlowSelectors,
  ...nightDesignationIndexSelectors,
};

/**
 * The ids of the accounts whose UTxOs only their own builders may spend:
 * custody accounts, whose UTxOs the custody script locks.
 */
export const selectAccountIdsExcludedFromSpending = selectCustodyAccountIds;

/**
 * Whether a feature's own store tracks the account's tokens: a custody
 * account's, which the custody store derives from its account state.
 */
export const isExtensionTokenAccount = (
  account: CardanoWalletAccount,
): boolean => isCardanoCustodyAccount(account);
