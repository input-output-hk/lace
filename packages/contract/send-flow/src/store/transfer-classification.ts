import { priceAmountInUsd } from '@lace-contract/token-pricing';

import type { TransferType } from '../types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { TokenIdMapper, TokenPrice } from '@lace-contract/token-pricing';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { BigNumber } from '@lace-sdk/util';

// Re-export so existing send-flow consumers keep their imports stable.
export { bucketUsdValue } from '@lace-contract/token-pricing';

export type Transfer = {
  amount: BigNumber;
  token: Token;
};

/**
 * Sum the USD value of a set of *fungible* transfers.
 * Returns undefined when:
 *  - any fungible token is missing a price,
 *  - any price is marked stale,
 *  - any price is missing priceInUsd.
 * NFTs are excluded (skipped entirely) — they are counted separately via `countNfts`.
 */
export const computeTransferValueUsd = ({
  transfers,
  prices,
  mapper,
}: {
  transfers: readonly Transfer[];
  prices: Record<string, TokenPrice>;
  mapper: TokenIdMapper | undefined;
}): number | undefined => {
  if (!mapper) return undefined;
  let totalUsd = 0;
  let fungibleCount = 0;
  for (const { amount, token } of transfers) {
    if (token.metadata?.isNft) continue;
    fungibleCount++;
    const usd = priceAmountInUsd({
      amount,
      decimals: token.decimals ?? 0,
      priceId: mapper.getTokenPriceId(token),
      prices,
    });
    if (usd === undefined) return undefined;
    totalUsd += usd;
  }
  if (fungibleCount === 0) return undefined;
  return totalUsd;
};

export const countNfts = (transfers: readonly Transfer[]): number =>
  transfers.filter(t => t.token.metadata?.isNft).length;

/**
 * Asset mix shape of the send transaction. Used to segment multi-asset send
 * behaviour (NFT-only sends, mixed bundles, plain fungible transfers) on
 * `send | transaction | success/failure` events without needing to compare
 * `nftCount` and `fungibleCount` in the dashboard.
 */
export type AssetMix = 'fungible-only' | 'mixed' | 'nft-only';

export const classifyAssetMix = (
  transfers: readonly Transfer[],
): AssetMix | undefined => {
  if (transfers.length === 0) return undefined;
  const nftCount = countNfts(transfers);
  if (nftCount === 0) return 'fungible-only';
  if (nftCount === transfers.length) return 'nft-only';
  return 'mixed';
};

/**
 * Classify a single recipient address relative to the user's wallets/accounts.
 * Uses the current send-flow form's single recipient; multi-recipient txs are
 * not representable in the form today — if they become possible, this fn
 * should be called per recipient and results reduced with `reduceTransferTypes`.
 */
export const classifyTransferType = ({
  recipientAddress,
  sourceAccountId,
  addresses,
  wallets,
}: {
  recipientAddress: string;
  sourceAccountId: AccountId;
  addresses: readonly AnyAddress[];
  wallets: readonly AnyWallet[];
}): TransferType => {
  const matching = addresses.find(a => a.address === recipientAddress);
  if (!matching) return 'foreign';
  if (matching.accountId === sourceAccountId) return 'self';

  const sourceWallet = wallets.find(w =>
    w.accounts.some(a => a.accountId === sourceAccountId),
  );
  const destinationWallet = wallets.find(w =>
    w.accounts.some(a => a.accountId === matching.accountId),
  );

  if (
    sourceWallet &&
    destinationWallet &&
    sourceWallet.walletId === destinationWallet.walletId
  ) {
    return 'intra_wallet';
  }
  return 'intra_account';
};
