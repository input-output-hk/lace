import type { AccountId } from '@lace-contract/wallet-repo';

/** Saved state could not be inspected, so a sync-mode change cannot be authorized. */
export class UnreadableDustSnapshotError extends Error {
  public constructor(readonly accountId: AccountId, cause: unknown) {
    super('Saved Dust sync data could not be read', { cause });
    this.name = 'UnreadableDustSnapshotError';
  }
}
