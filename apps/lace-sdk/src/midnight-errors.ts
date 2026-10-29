import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { AccountId } from '@lace-contract/wallet-repo';

/** The `code` of each Midnight error the SDK throws or returns. */
export type MidnightErrorCode =
  | 'midnight-account-not-found'
  | 'midnight-network-not-configured'
  | 'midnight-nothing-to-register'
  | 'midnight-submit-timeout'
  | 'midnight-wallet-not-ready';

/** The loadout has no endpoints for the network: none public, none from `networks`. */
export class MidnightNetworkNotConfiguredError extends Error {
  public readonly code: MidnightErrorCode = 'midnight-network-not-configured';

  public constructor(networkId: MidnightSDKNetworkId) {
    super(
      `Midnight network "${networkId}" has no endpoints in this loadout: pass networks.${networkId} with nodeAddress and indexerAddress to createMidnightModule`,
    );
    this.name = 'MidnightNetworkNotConfiguredError';
  }
}

/** No single in-memory Midnight account on the active network answers the request. */
export class MidnightAccountNotFoundError extends Error {
  public readonly code: MidnightErrorCode = 'midnight-account-not-found';

  public constructor(message: string) {
    super(message);
    this.name = 'MidnightAccountNotFoundError';
  }
}

/** The engine did not start the account's wallets within the wait. */
export class MidnightWalletNotReadyError extends Error {
  public readonly code: MidnightErrorCode = 'midnight-wallet-not-ready';

  public constructor(accountId: AccountId, timeoutMs: number) {
    super(
      `Midnight wallet for account "${accountId}" did not start within ${timeoutMs}ms`,
    );
    this.name = 'MidnightWalletNotReadyError';
  }
}

/** The account holds no available NIGHT to register for DUST generation. */
export class MidnightNothingToRegisterError extends Error {
  public readonly code: MidnightErrorCode = 'midnight-nothing-to-register';

  public constructor(accountId: AccountId) {
    super(`Account "${accountId}" has no available NIGHT to register`);
    this.name = 'MidnightNothingToRegisterError';
  }
}

/**
 * `submitMidnightTx` stopped waiting for the node to report the transaction final. The engine had already been
 * given the transaction, so it may be on chain or reach it later: look for `activityHash` in the account's
 * activities before submitting again.
 */
export class MidnightSubmitTimeoutError extends Error {
  public readonly code: MidnightErrorCode = 'midnight-submit-timeout';
  /** The transaction's hash, which is the `activityId` of its activity. */
  public readonly activityHash: string;

  public constructor(activityHash: string, timeoutMs: number) {
    super(
      `Midnight transaction ${activityHash} was not reported final within ${timeoutMs}ms and may still reach the chain`,
    );
    this.name = 'MidnightSubmitTimeoutError';
    this.activityHash = activityHash;
  }
}
