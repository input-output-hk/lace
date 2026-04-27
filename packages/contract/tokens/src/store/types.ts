import type { RawToken } from '../types';
import type { FolderId, TokenId } from '../value-objects';
import type { Address } from '@lace-contract/addresses';
import type { WalletEntity } from '@lace-contract/wallet-repo';
import type { BigNumber } from '@lace-sdk/util';

export type Folder = {
  id: FolderId;
  name: string;
  accountId: string;
};

export type WalletEntitiesMap = Record<string, WalletEntity>;
export type AccountTokensMap = Partial<
  Record<Address, Partial<Record<TokenId, RawToken>>>
>;

export interface TokenDistributionItem {
  accountId: string;
  accountName?: string;
  walletId: string;
  walletName?: string;
  blockchainName: string;
  balance: number;
}

export interface TokenTotalBalance {
  tokenId: string;
  available: BigNumber;
  pending: BigNumber;
  total: BigNumber;
  decimals: number;
  displayDecimalPlaces?: number;
  displayShortName: string;
  formattedCoinQuantity: string;
  formattedTotalBalance: string;
  estimatedPrice: string;
}

export interface TokenDistributionWithTotals {
  distribution: TokenDistributionItem[];
  totals: TokenTotalBalance | undefined;
}
