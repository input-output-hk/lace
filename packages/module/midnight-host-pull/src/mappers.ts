// Pure wire → redux mapping for the Midnight state pull (ADR 47). Each helper
// turns a `midnight.getState` / `getSyncStatus` snapshot into the SAME redux
// payloads the monolith watch effects dispatch (@lace-module/midnight-sync
// store/side-effects/watch.ts), so the guest renders Midnight identically
// without an engine. All functions are pure (no Date.now / no rxjs) so the
// polling side effect stays thin and every shape is unit-testable.

import { Percent } from '@cardano-sdk/util';
import { ActivityType } from '@lace-contract/activities';
import {
  createInitialMidnightTokenMetadata,
  createMidnightToken,
  MidnightDustAddress,
  MidnightShieldedAddress,
  MidnightUnshieldedAddress,
  toUnshieldedTokenType,
} from '@lace-contract/midnight-context';
import { TokenId } from '@lace-contract/tokens';
import { BigNumber, HexBytes, Timestamp } from '@lace-lib/util';

import type { Activity } from '@lace-contract/activities';
import type { Address, UpsertAddressesPayload } from '@lace-contract/addresses';
import type {
  DustGenerationDetails,
  MidnightAccountId,
  MidnightAccountPublicKeys,
  MidnightSDKNetworkId,
  MidnightTokenKind,
} from '@lace-contract/midnight-context';
import type { UpsertTokensMetadataPayload } from '@lace-contract/tokens';
import type {
  MidnightHistoryEntry,
  MidnightStateSnapshot,
  MidnightSyncStatus,
  MidnightTokenBalance,
} from '@lace-lib/extension-shell-api';

/** The public props the cardano-host-pull hydrator projects onto a guest
 * Midnight InMemory account — the fields the poll + send legs read. Public
 * material only; the guest holds no Midnight secret. */
export type MidnightPublicAccountProps = {
  accountIndex: number;
  networkId: MidnightSDKNetworkId;
};

/** The redux `setAddressTokens` payload for one address (mirrors the rawTokens
 * slice `SetTokensPayload`, minus the fields the reducer fills). */
export type AddressTokensPayload = {
  accountId: MidnightAccountId;
  address: Address;
  blockchainName: 'Midnight';
  tokens: ReturnType<typeof createMidnightToken>[];
};

/**
 * The redux token id the monolith keys a Midnight token by: shielded tokens use
 * the RAW type, unshielded tokens the network-qualified `toUnshieldedTokenType`
 * prefix (midnight-sync store/dependencies.ts coinsByTokenType$). The wire
 * carries RAW types in both arrays (kind is implicit in which array a balance
 * came from), so the guest re-applies the prefix for the unshielded kind.
 */
const toReduxTokenType = (
  tokenType: string,
  kind: MidnightTokenKind,
  networkId: MidnightSDKNetworkId,
): string =>
  kind === 'unshielded'
    ? toUnshieldedTokenType(tokenType, networkId)
    : tokenType;

const balanceToTokens = (
  coins: MidnightTokenBalance[],
  kind: MidnightTokenKind,
  networkId: MidnightSDKNetworkId,
): ReturnType<typeof createMidnightToken>[] =>
  coins.map(coin =>
    createMidnightToken(toReduxTokenType(coin.tokenType, kind, networkId), {
      available: BigInt(coin.available),
      pending: BigInt(coin.pending),
    }),
  );

/**
 * `tokens.setAddressTokens` payloads — the shielded balances against the
 * shielded address and (when the unshielded flag is on) the unshielded balances
 * against the unshielded address, mirroring the monolith `updateTokens`.
 */
export const snapshotToAddressTokenPayloads = ({
  accountId,
  snapshot,
  networkId,
  isUnshieldedEnabled,
}: {
  accountId: MidnightAccountId;
  snapshot: MidnightStateSnapshot;
  networkId: MidnightSDKNetworkId;
  isUnshieldedEnabled: boolean;
}): AddressTokensPayload[] => {
  const payloads: AddressTokensPayload[] = [
    {
      accountId,
      address: MidnightShieldedAddress(
        snapshot.midnightAccount.shieldedAddress,
      ),
      blockchainName: 'Midnight',
      tokens: balanceToTokens(snapshot.shieldedCoins, 'shielded', networkId),
    },
  ];
  if (isUnshieldedEnabled) {
    payloads.push({
      accountId,
      address: MidnightUnshieldedAddress(
        snapshot.midnightAccount.unshieldedAddress,
      ),
      blockchainName: 'Midnight',
      tokens: balanceToTokens(
        snapshot.unshieldedCoins,
        'unshielded',
        networkId,
      ),
    });
  }
  return payloads;
};

/**
 * `tokens.upsertTokensMetadata` payload — one metadata entry per token type,
 * with `balances` so zero-balance tokens are filtered out by the reducer. The
 * per-coin `coins` detail the monolith carries is NOT on the wire (ADR 47), so
 * dust-designation coin selection degrades to the aggregate balance — an
 * accepted guest limitation (dust-designation is a monolith-only advanced flow).
 */
export const snapshotToTokenMetadataPayload = (
  snapshot: MidnightStateSnapshot,
  networkId: MidnightSDKNetworkId,
  isUnshieldedEnabled: boolean,
): UpsertTokensMetadataPayload => {
  const balances: Record<string, string> = {};
  const build = (coins: MidnightTokenBalance[], kind: MidnightTokenKind) =>
    coins.map(coin => {
      const tokenType = toReduxTokenType(coin.tokenType, kind, networkId);
      balances[tokenType] = (
        BigInt(coin.available) + BigInt(coin.pending)
      ).toString();
      return createInitialMidnightTokenMetadata({ tokenType, kind, networkId });
    });

  const metadatas = [
    ...build(snapshot.shieldedCoins, 'shielded'),
    ...(isUnshieldedEnabled
      ? build(snapshot.unshieldedCoins, 'unshielded')
      : []),
  ];
  return {
    metadatas,
    balances: balances as UpsertTokensMetadataPayload['balances'],
  };
};

/** `addresses.upsertAddresses` payload — shielded + dust always, unshielded when
 * the flag is on (mirrors the monolith `upsertAddresses`). */
export const snapshotToAddressesPayload = (
  accountId: MidnightAccountId,
  snapshot: MidnightStateSnapshot,
  isUnshieldedEnabled: boolean,
): UpsertAddressesPayload => ({
  blockchainName: 'Midnight',
  accountId,
  addresses: [
    {
      address: MidnightShieldedAddress(
        snapshot.midnightAccount.shieldedAddress,
      ),
    },
    isUnshieldedEnabled
      ? {
          address: MidnightUnshieldedAddress(
            snapshot.midnightAccount.unshieldedAddress,
          ),
        }
      : undefined,
    { address: MidnightDustAddress(snapshot.midnightAccount.dustAddress) },
  ].filter(entry => entry !== undefined),
});

/** `midnightContext.setPublicKeys` payload. */
export const snapshotToPublicKeys = (
  snapshot: MidnightStateSnapshot,
): MidnightAccountPublicKeys => ({
  coin: HexBytes(snapshot.midnightAccount.publicKeys.coinPublicKey),
  encryption: HexBytes(snapshot.midnightAccount.publicKeys.encryptionPublicKey),
});

/** `midnightContext.setDustBalance` values: the displayed total and the
 * SPENDABLE subset (a build moves the whole dust coin it pays with into
 * pending, so only the latter answers whether another transfer can be funded). */
export const snapshotToDustBalance = (
  snapshot: MidnightStateSnapshot,
): { dustBalance: BigNumber; dustAvailable: BigNumber } => ({
  dustBalance: BigNumber(BigInt(snapshot.dust.balance)),
  dustAvailable: BigNumber(BigInt(snapshot.dust.available)),
});

/** `midnightContext.setDustGenerationDetails` value (or undefined when the
 * account holds no dust-generating coins). The wire carries JSON-safe strings /
 * epoch-ms; this reifies them to the slice's `DustGenerationDetails`. */
export const snapshotToDustGenerationDetails = (
  snapshot: MidnightStateSnapshot,
): DustGenerationDetails | undefined => {
  const details = snapshot.dust.generationDetails;
  if (!details) return undefined;
  return {
    currentValue: BigInt(details.currentValue),
    maxCap: BigInt(details.maxCap),
    rate: BigInt(details.rate),
    decayTime: details.decayTime ?? undefined,
    maxCapReachedAt: details.maxCapReachedAt ?? undefined,
  };
};

/** The determinate sync progress + completion the monolith `updateSyncProgress`
 * derives, adapted to the wire's aggregate `synced` flag: average the applicable
 * sub-wallet ratios (dust only once it has started), complete when `synced`.
 * Returns null when the engine is cold with no progress to report. */
export const computeSyncPlan = (
  status: MidnightSyncStatus,
  isUnshieldedEnabled: boolean,
): { progress: Percent; isComplete: boolean } | null => {
  if (!status.progress) return null;
  const { shielded, unshielded, dust } = status.progress;
  const ratios = [shielded];
  if (isUnshieldedEnabled) ratios.push(unshielded);
  // Only fold dust into the displayed ratio once it has started, so an unstarted
  // dust wallet does not artificially halve the percentage (monolith parity).
  if (dust > 0) ratios.push(dust);
  const progress =
    ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return { progress: Percent(progress), isComplete: status.synced };
};

const directionToActivityType = (
  direction: MidnightHistoryEntry['direction'],
): ActivityType => {
  switch (direction) {
    case 'incoming':
      return ActivityType.Receive;
    case 'outgoing':
      return ActivityType.Send;
    case 'failed':
      return ActivityType.Failed;
    case 'pending':
      return ActivityType.Pending;
  }
};

/**
 * Map the wire tx history into activities (mirrors the monolith
 * `mapTxHistoryEntryToActivity`). The host resolves `direction` so the guest
 * does not re-run the SDK status→type logic. History deltas are unshielded
 * (the monolith activity mapping reads the unshielded tx history), so the raw
 * wire token types are re-prefixed for the redux token id.
 */
export const snapshotToActivities = (
  accountId: MidnightAccountId,
  snapshot: MidnightStateSnapshot,
  networkId: MidnightSDKNetworkId,
): Activity[] =>
  snapshot.transactionHistory.map(entry => ({
    accountId,
    activityId: entry.id,
    type: directionToActivityType(entry.direction),
    timestamp: Timestamp(entry.timestamp),
    tokenBalanceChanges: entry.deltas.map(delta => ({
      tokenId: TokenId(toUnshieldedTokenType(delta.tokenType, networkId)),
      amount: BigNumber(BigInt(delta.amount)),
    })),
  }));
