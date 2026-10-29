import {
  DREP_ALWAYS_ABSTAIN,
  DREP_ALWAYS_NO_CONFIDENCE,
  isDrepId,
  isSentinelDrepId,
  toCanonicalDrepId,
} from '@lace-contract/cardano-context';
import { FeatureFlagKey } from '@lace-contract/feature';

import type {
  CardanoPromotedNetworkKey,
  DRepSummary,
  PromotedInformation,
} from '@lace-contract/cardano-context';

// Network-key mapping and localized-copy picker now live in the shared Cardano
// contract (consumed by governance, staking and earn-rewards alike). Re-exported
// here so existing `@lace-contract/governance-center` / `../const` imports are
// unaffected.
export {
  promotedNetworkKeyForChainId,
  pickPromotedInformation,
} from '@lace-contract/cardano-context';
export type { CardanoPromotedNetworkKey } from '@lace-contract/cardano-context';

// The DRep vote-delegation sentinels and classifier live in cardano-context
// (owner of RewardAccountInfo.drepId). Re-exported for existing consumers.
export { DREP_ALWAYS_ABSTAIN, DREP_ALWAYS_NO_CONFIDENCE, isSentinelDrepId };

export const FEATURE_FLAG_GOVERNANCE_CENTER =
  FeatureFlagKey('GOVERNANCE_CENTER');

/**
 * Vote-delegation status of a reward account, derived purely from its `drepId`
 * (as reported by the provider). The UI maps each category to a localized label.
 */
export type DelegationStatus =
  | 'abstaining'
  | 'delegated'
  | 'no-confidence'
  | 'not-delegated';

export const getDelegationStatus = (drepId?: string): DelegationStatus => {
  if (drepId === undefined) return 'not-delegated';
  if (drepId === DREP_ALWAYS_ABSTAIN) return 'abstaining';
  if (drepId === DREP_ALWAYS_NO_CONFIDENCE) return 'no-confidence';
  return 'delegated';
};

/** Localized promotional copy for a promoted DRep. Alias of the shared type. */
export type PromotedDRepInformation = PromotedInformation;

/** A single Lace-promoted DRep entry from the feature-flag payload. */
export type PromotedDRep = {
  id: string;
  additional_information?: PromotedDRepInformation;
};

/** Shape of the optional `GOVERNANCE_CENTER` feature-flag payload. */
export type GovernanceCenterFeatureFlagPayload = {
  promotedDreps?: Partial<Record<CardanoPromotedNetworkKey, PromotedDRep[]>>;
  /**
   * DRep ids Lace blocks from the browse directory: they render in no list
   * order and match no search, EXCEPT when the query is the exact DRep id
   * (either encoding) — deliberate access stays possible, discovery does not,
   * and delegation to a pasted id is unaffected. An explicit, product-owned
   * editorial act (the inverse of `promotedDreps`) — never inferred by the
   * ranking and never hardcoded in source.
   */
  blockedDreps?: Partial<Record<CardanoPromotedNetworkKey, string[]>>;
};

// Remote flag payloads are runtime-editable, so the shape is enforced rather
// than trusted: a non-array network entry would otherwise reach the browse
// sheet and crash its Set construction; here it degrades to "not configured".
// Keys that name no known network are dropped, and so is a value that is not
// a DRep id, which keeps the declared return type honest — safe only because
// describeGovernancePayloadIssues reports both first, so the drop is visible
// rather than another silent degradation.
//
// Object.hasOwn, not `in`: `in` walks the prototype chain, so a section keyed
// `constructor` or `toString` would pass as a known network and be stored
// under a key the declared type says cannot exist.
const sanitizeBlockedDreps = (
  value: unknown,
): GovernanceCenterFeatureFlagPayload['blockedDreps'] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const perNetwork = Object.entries(value as Record<string, unknown>)
    .filter(
      (entry): entry is [string, unknown[]] =>
        Object.hasOwn(GOVERNANCE_NETWORK_KEYS, entry[0]) &&
        Array.isArray(entry[1]),
    )
    .map(([networkKey, ids]): [string, string[]] => [
      networkKey,
      ids.flatMap((id): string[] => {
        const canonical = toCanonicalDrepId(id);
        return canonical === undefined ? [] : [canonical];
      }),
    ]);
  return Object.fromEntries(perNetwork);
};

/**
 * The promoted section reduced to what consumers can use: known networks only,
 * every id as canonical CIP-129, and per network no blocked entry, no repeat
 * of a DRep already listed, and no entry whose id is not a DRep id.
 *
 * The id is rewritten, not merely compared, so consumers can match an entry
 * against a directory row by equality. That rewrite is why the de-duplication
 * is needed: two entries naming one DRep in the two encodings used to differ
 * and now do not, and the browse sheet keys its promoted cards by id.
 *
 * Dropping an unusable id matters beyond tidiness: it would otherwise hold the
 * first slot, the only one `resolveEarnRewardsTarget` reads, and suppress the
 * whole vote-delegation offer while a valid entry sat behind it.
 */
const sanitizePromotedDreps = (
  promoted: NonNullable<GovernanceCenterFeatureFlagPayload['promotedDreps']>,
  blocked: GovernanceCenterFeatureFlagPayload['blockedDreps'],
): GovernanceCenterFeatureFlagPayload['promotedDreps'] =>
  Object.fromEntries(
    Object.entries(promoted)
      // Object.hasOwn is what makes the `blocked[networkKey]` lookup below
      // safe: under `in` a section keyed `toString` passed as a known network
      // and that lookup resolved to an Object.prototype method, which `?.`
      // does not guard against.
      .filter(([networkKey]) =>
        Object.hasOwn(GOVERNANCE_NETWORK_KEYS, networkKey),
      )
      .map(([networkKey, entries]) => {
        if (!Array.isArray(entries)) return [networkKey, []];
        const blockedIds = blocked?.[networkKey as CardanoPromotedNetworkKey];
        const seen = new Set<string>();
        return [
          networkKey,
          entries.flatMap((entry): PromotedDRep[] => {
            const id = toCanonicalDrepId(entry?.id);
            if (id === undefined || seen.has(id) || blockedIds?.includes(id))
              return [];
            seen.add(id);
            return [{ ...entry, id }];
          }),
        ];
      }),
  );

/**
 * The network keys the GOVERNANCE_CENTER payload may use. TOTAL over
 * {@link CardanoPromotedNetworkKey} on purpose: adding a network without
 * listing it here is a compile error, so the validator below can never call
 * a real network "unknown".
 *
 * One PostHog flag feeds both stacks, so this set has a twin in
 * `@lace-next/core`'s `featureFlags.ts` that has to list the same keys:
 * a key only one side knows is reported as unknown by the other, for every
 * user, on every boot. Edit them together.
 */
const GOVERNANCE_NETWORK_KEYS: Record<CardanoPromotedNetworkKey, true> = {
  mainnet: true,
  preprod: true,
  preview: true,
  sanchonet: true,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Problems in one `{ [network]: id[] }` section, as `field.path` strings.
 * `idOf` pulls the id out of an entry, since `blockedDreps` holds bare ids
 * and `promotedDreps` holds objects carrying one.
 */
const describeSectionIssues = (
  section: unknown,
  field: string,
  idOf: (entry: unknown) => unknown,
): string[] => {
  // Both parsers read null as "nothing configured", exactly as they read an
  // absent section, so reporting it would be an alarm about a payload that
  // works.
  if (section === undefined || section === null) return [];
  if (!isPlainObject(section)) return [`${field} is not an object`];

  return Object.entries(section).flatMap(([networkKey, entries]): string[] => {
    // Object.hasOwn, not `in`: `in` walks the prototype chain, so a section
    // keyed `constructor` or `toString` would pass as a known network here
    // while the parser drops it — the silent degradation this exists to end.
    if (!Object.hasOwn(GOVERNANCE_NETWORK_KEYS, networkKey)) {
      return [`${field}.${networkKey} is not a known network`];
    }
    if (!Array.isArray(entries)) {
      return [`${field}.${networkKey} is not an array`];
    }
    return entries.flatMap((entry, index): string[] => {
      const id = idOf(entry);
      return typeof id === 'string' && isDrepId(id)
        ? []
        : [`${field}.${networkKey}[${index}] is not a DRep id`];
    });
  });
};

/**
 * Everything wrong with a GOVERNANCE_CENTER payload, or `[]` when it is
 * usable. Reported once where the flag is synced, because the parser below
 * cannot raise: it degrades a broken payload to "not configured", which is
 * indistinguishable from ops deliberately configuring nothing. Without this,
 * a typo'd network key or a mistyped id silently blocks and promotes nobody,
 * and the first sign of it is a human noticing a DRep in the browse sheet
 * that was supposed to be hidden.
 *
 * Absent and empty are NOT problems: no flag, no section and an empty list
 * are all legitimate "nothing configured" states.
 */
export const describeGovernancePayloadIssues = (payload: unknown): string[] => {
  if (payload === undefined || payload === null) return [];
  if (!isPlainObject(payload)) return ['payload is not an object'];

  return [
    ...describeSectionIssues(
      payload.blockedDreps,
      'blockedDreps',
      entry => entry,
    ),
    ...describeSectionIssues(payload.promotedDreps, 'promotedDreps', entry =>
      isPlainObject(entry) ? entry.id : undefined,
    ),
  ];
};

/**
 * Defensively extracts the known fields of an untyped feature-flag payload:
 * malformed shapes degrade to "not configured" rather than reaching consumers.
 * A blocked id also beats a promoted one — blocking is the safety control, so
 * a config listing the same DRep in both stops recommending it everywhere this
 * parser feeds (browse sheet promoted section, earn-rewards target).
 */
export const parseGovernanceFeatureFlagPayload = (flag?: {
  payload?: unknown;
}): GovernanceCenterFeatureFlagPayload => {
  const payload = flag?.payload;
  if (!payload || typeof payload !== 'object') return {};
  const { promotedDreps, blockedDreps } =
    payload as GovernanceCenterFeatureFlagPayload;
  const blocked = sanitizeBlockedDreps(blockedDreps);
  const rawPromoted =
    promotedDreps &&
    typeof promotedDreps === 'object' &&
    !Array.isArray(promotedDreps)
      ? promotedDreps
      : undefined;
  const promoted = rawPromoted && sanitizePromotedDreps(rawPromoted, blocked);
  return {
    ...(promoted && { promotedDreps: promoted }),
    ...(blocked && { blockedDreps: blocked }),
  };
};

export type DelegationHealth =
  | 'delegated'
  | 'drep-problem'
  | 'not-delegated'
  | 'unknown';

/**
 * Health of an account's vote delegation against the fully-fetched DRep list.
 * `unknown` (list not ready for a specific-DRep delegation) exists so the UI
 * can avoid false problem warnings while the list loads.
 */
export const getDelegationHealth = ({
  drepId,
  dReps,
  listReady,
}: {
  drepId: string | undefined;
  dReps: readonly DRepSummary[];
  listReady: boolean;
}): DelegationHealth => {
  if (drepId === undefined) return 'not-delegated';
  if (isSentinelDrepId(drepId)) return 'delegated';
  if (!listReady) return 'unknown';
  const summary = dReps.find(dRep => dRep.drepId === drepId);
  if (!summary || summary.retired || summary.expired) return 'drep-problem';
  return 'delegated';
};
