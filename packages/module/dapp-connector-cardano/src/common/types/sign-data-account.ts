import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Active account row on Sign Data (CIP-8) — shared by hook and UI.
 */
export type SignDataAccountInfo = {
  name: string;
  avatarUri?: string;
  accountId: AccountId;
};
