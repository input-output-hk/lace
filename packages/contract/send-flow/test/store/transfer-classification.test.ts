import { WalletId, type AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  bucketUsdValue,
  classifyTransferType,
  computeTransferValueUsd,
  countNfts,
  type Transfer,
} from '../../src/store/transfer-classification';

import type { AnyAddress } from '@lace-contract/addresses';
import type { TokenIdMapper, TokenPrice } from '@lace-contract/token-pricing';
import type { Token, TokenId } from '@lace-contract/tokens';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const usdPrice = (price: number, overrides?: Partial<TokenPrice>): TokenPrice =>
  ({
    priceId: 'pid' as never,
    blockchain: 'Cardano',
    identifier: 'ada',
    fiatCurrency: 'USD',
    price,
    priceInUsd: price,
    lastUpdated: 1,
    ...overrides,
  } as TokenPrice);

const token = (tokenId: string, decimals: number, isNft = false): Token =>
  ({
    tokenId: tokenId as TokenId,
    decimals,
    metadata: { decimals, isNft, blockchainSpecific: {} },
  } as unknown as Token);

const mapper = (map: Record<string, string>): TokenIdMapper =>
  ({
    blockchainName: 'Cardano',
    getTokenPriceId: (t: Token) => map[t.tokenId] as never,
    getTokenPriceRequest: () => ({} as never),
  } as TokenIdMapper);

describe('bucketUsdValue', () => {
  it.each<[number, string]>([
    [0, 'XS'],
    [9.99, 'XS'],
    [10, 'S'],
    [99, 'S'],
    [100, 'M'],
    [499, 'M'],
    [500, 'L'],
    [2499, 'L'],
    [2500, 'XL'],
    [9999, 'XL'],
    [10_000, 'XXL'],
    [49_999, 'XXL'],
    [50_000, 'XXXL'],
    [99_999, 'XXXL'],
    [100_000, 'WHALE'],
    [10_000_000, 'WHALE'],
  ])('maps $%d → %s', (usd, expected) => {
    expect(bucketUsdValue(usd)).toBe(expected);
  });
});

describe('computeTransferValueUsd', () => {
  const ada = token('lovelace', 6);
  const fooCustomToken = token('foo', 0);
  const nft = token('nft-1', 0, true);

  const priceMapper = mapper({ lovelace: 'ada-priceid', foo: 'foo-priceid' });

  it('sums fungible USD values across transfers', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(2_000_000n), token: ada }, // 2 ADA × $0.5 = $1
      { amount: BigNumber(3n), token: fooCustomToken }, // 3 FOO × $2 = $6
    ];
    const prices: Record<string, TokenPrice> = {
      'ada-priceid': usdPrice(0.5),
      'foo-priceid': usdPrice(2),
    };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBe(7);
  });

  it('skips NFTs in the sum', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada },
      { amount: BigNumber(1n), token: nft },
    ];
    const prices: Record<string, TokenPrice> = {
      'ada-priceid': usdPrice(1),
    };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBe(1);
  });

  it('returns undefined when any fungible price is missing', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada },
      { amount: BigNumber(1n), token: fooCustomToken },
    ];
    const prices: Record<string, TokenPrice> = { 'ada-priceid': usdPrice(1) };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBeUndefined();
  });

  it('uses priceInUsd regardless of the display fiatCurrency', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada }, // 1 ADA
    ];
    const prices: Record<string, TokenPrice> = {
      // Display price is in GBP but priceInUsd is the USD value
      'ada-priceid': usdPrice(0.5, { fiatCurrency: 'GBP', priceInUsd: 0.635 }),
    };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBeCloseTo(0.635);
  });

  it('returns undefined when priceInUsd is missing', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada },
    ];
    const prices: Record<string, TokenPrice> = {
      'ada-priceid': usdPrice(1, { priceInUsd: undefined as never }),
    };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBeUndefined();
  });

  it('returns undefined when a price is stale', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada },
    ];
    const prices: Record<string, TokenPrice> = {
      'ada-priceid': usdPrice(1, { isStale: true }),
    };
    expect(
      computeTransferValueUsd({ transfers, prices, mapper: priceMapper }),
    ).toBeUndefined();
  });

  it('returns undefined when mapper is unavailable (e.g. Midnight)', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1_000_000n), token: ada },
    ];
    expect(
      computeTransferValueUsd({ transfers, prices: {}, mapper: undefined }),
    ).toBeUndefined();
  });

  it('returns undefined for an NFT-only transfer (no fungibles to price)', () => {
    const transfers: Transfer[] = [{ amount: BigNumber(1n), token: nft }];
    expect(
      computeTransferValueUsd({ transfers, prices: {}, mapper: priceMapper }),
    ).toBeUndefined();
  });
});

describe('countNfts', () => {
  it('counts only tokens flagged isNft', () => {
    const transfers: Transfer[] = [
      { amount: BigNumber(1n), token: token('a', 0, true) },
      { amount: BigNumber(1n), token: token('b', 0, false) },
      { amount: BigNumber(1n), token: token('c', 0, true) },
    ];
    expect(countNfts(transfers)).toBe(2);
  });
});

describe('classifyTransferType', () => {
  const wallet1 = {
    walletId: WalletId('wallet-1'),
    accounts: [
      { accountId: 'acc-1-a' as AccountId } as never,
      { accountId: 'acc-1-b' as AccountId } as never,
    ],
  } as unknown as AnyWallet;
  const wallet2 = {
    walletId: WalletId('wallet-2'),
    accounts: [{ accountId: 'acc-2-a' as AccountId } as never],
  } as unknown as AnyWallet;
  const wallets: AnyWallet[] = [wallet1, wallet2];

  const addresses: AnyAddress[] = [
    { accountId: 'acc-1-a', address: 'addr-self' } as never,
    { accountId: 'acc-1-b', address: 'addr-sibling' } as never,
    { accountId: 'acc-2-a', address: 'addr-other-wallet' } as never,
  ];

  it('classifies self when recipient is in same account', () => {
    expect(
      classifyTransferType({
        recipientAddress: 'addr-self',
        sourceAccountId: 'acc-1-a' as AccountId,
        addresses,
        wallets,
      }),
    ).toBe('self');
  });

  it('classifies intra_wallet when recipient is different account, same wallet', () => {
    expect(
      classifyTransferType({
        recipientAddress: 'addr-sibling',
        sourceAccountId: 'acc-1-a' as AccountId,
        addresses,
        wallets,
      }),
    ).toBe('intra_wallet');
  });

  it('classifies intra_account when recipient is in another of user-owned wallets', () => {
    expect(
      classifyTransferType({
        recipientAddress: 'addr-other-wallet',
        sourceAccountId: 'acc-1-a' as AccountId,
        addresses,
        wallets,
      }),
    ).toBe('intra_account');
  });

  it('classifies foreign when recipient is unknown', () => {
    expect(
      classifyTransferType({
        recipientAddress: 'addr-some-exchange',
        sourceAccountId: 'acc-1-a' as AccountId,
        addresses,
        wallets,
      }),
    ).toBe('foreign');
  });
});
