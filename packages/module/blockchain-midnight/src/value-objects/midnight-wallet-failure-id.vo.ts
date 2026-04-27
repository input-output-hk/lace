import type { FailureId } from '@lace-contract/failures';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Midnight wallet initialization/unlock failures.
 *
 * Extends the base FailureId type using hierarchical pattern (ADR 13).
 * Each Midnight wallet has a stable failure ID based on its walletId.
 *
 * @example
 * const failureId = MidnightWalletFailureId(wallet.walletId);
 */
export type MidnightWalletFailureId = FailureId &
  Tagged<string, 'MidnightWalletFailureId'>;

export const MidnightWalletFailureId = (
  walletId: WalletId,
): MidnightWalletFailureId =>
  `midnight-wallet-${walletId}` as MidnightWalletFailureId;
