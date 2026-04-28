import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { TokenId } from '../../src';
import { tokensSelectors } from '../../src/store/slice/slice';

import { buildTestScenario } from './mock-tokens';

import type { RawTokensState } from '../../src/store/slice/rawTokensSlice';
import type { TokensMetadataState } from '../../src/store/slice/tokensMetadataSlice';
import type { Address } from '@lace-contract/addresses';
import type { State } from '@lace-contract/module';
import type { NetworkSliceState } from '@lace-contract/network';
import type { WalletEntity } from '@lace-contract/wallet-repo';

type TestAccount = {
  accountId: AccountId;
  walletId: string;
  blockchainName: 'Bitcoin' | 'Cardano';
  networkType: 'mainnet' | 'testnet';
  blockchainNetworkId?: string;
  name?: string;
};

const createWallet = (
  walletId: string,
  accounts: TestAccount[],
): WalletEntity =>
  ({
    walletId: WalletId(walletId),
    metadata: { name: `Wallet ${walletId}`, order: 0 },
    type: WalletType.InMemory,
    accounts: accounts.map(account => ({
      accountId: account.accountId,
      walletId: WalletId(account.walletId),
      accountType: 'InMemory',
      blockchainName: account.blockchainName,
      networkType: account.networkType,
      blockchainNetworkId: account.blockchainNetworkId,
      metadata: { name: account.name ?? `${account.blockchainName} #0` },
      blockchainSpecific: {},
    })),
  } as WalletEntity);

const createState = ({
  rawTokensState = {},
  tokensMetadataState = { byTokenId: {} },
  walletsEntities = {},
  networkType,
  blockchainNetworks,
}: {
  rawTokensState?: RawTokensState;
  tokensMetadataState?: TokensMetadataState;
  walletsEntities?: Record<string, WalletEntity>;
  networkType?: 'mainnet' | 'testnet';
  blockchainNetworks?: NetworkSliceState['blockchainNetworks'];
}): State =>
  ({
    rawTokens: rawTokensState,
    tokensMetadata: tokensMetadataState,
    wallets: { ids: Object.keys(walletsEntities), entities: walletsEntities },
    network: {
      ...(networkType ? { networkType } : {}),
      blockchainNetworks: blockchainNetworks ?? {},
    },
  } as unknown as State);

describe('selectVisibleAccountIds', () => {
  const cardanoPreprod = BlockchainNetworkId('cardano-1');
  const cardanoPreview = BlockchainNetworkId('cardano-2');
  const bitcoinTestnet4 = BlockchainNetworkId('bitcoin-testnet4');

  const cardanoPreprodAccount = AccountId('cardano-1');
  const cardanoPreviewAccount = AccountId('cardano-2');
  const bitcoinAccount = AccountId('bitcoin-testnet');
  const cardanoMainnetAccount = AccountId('cardano-764824073');

  const walletsEntities = {
    w1: createWallet('w1', [
      {
        accountId: cardanoPreprodAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'testnet',
        blockchainNetworkId: cardanoPreprod,
      },
      {
        accountId: cardanoPreviewAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'testnet',
        blockchainNetworkId: cardanoPreview,
      },
      {
        accountId: cardanoMainnetAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
      },
    ]),
    w2: createWallet('w2', [
      {
        accountId: bitcoinAccount,
        walletId: 'w2',
        blockchainName: 'Bitcoin',
        networkType: 'testnet',
        blockchainNetworkId: bitcoinTestnet4,
      },
    ]),
  };

  it('returns no accounts when network type is undefined', () => {
    const state = createState({
      walletsEntities,
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: cardanoPreprod,
        },
      },
    });

    const result = tokensSelectors.tokens.selectVisibleAccountIds(state);
    expect(result).toEqual([]);
  });

  it('filters by active network type', () => {
    const state = createState({
      walletsEntities,
      networkType: 'mainnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: cardanoPreprod,
        },
      },
    });

    const result = tokensSelectors.tokens.selectVisibleAccountIds(state);
    expect(result).toEqual([cardanoMainnetAccount]);
  });

  it('filters testnet accounts by selected network id per blockchain', () => {
    const state = createState({
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: cardanoPreprod,
        },
      },
    });

    const result = tokensSelectors.tokens.selectVisibleAccountIds(state);
    expect(result).toEqual([cardanoPreprodAccount, bitcoinAccount]);
  });
});

describe('selectAggregatedFungibleTokensForVisibleAccounts', () => {
  it('aggregates tokens only across visible accounts', () => {
    const { rawTokensState } = buildTestScenario([
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-1'),
        address: 'addr-cardano-1' as Address,
        available: 1n,
      },
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('bitcoin-testnet'),
        address: 'addr-bitcoin-testnet' as Address,
        available: 2n,
        blockchainName: 'Bitcoin',
      },
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-2'),
        address: 'addr-cardano-2' as Address,
        available: 5n,
      },
      {
        tokenId: TokenId('BBB'),
        accountId: AccountId('cardano-2'),
        address: 'addr-cardano-2' as Address,
        available: 10n,
      },
    ]);

    const walletsEntities = {
      w1: createWallet('w1', [
        {
          accountId: AccountId('cardano-1'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-1'),
        },
        {
          accountId: AccountId('cardano-2'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-2'),
        },
      ]),
      w2: createWallet('w2', [
        {
          accountId: AccountId('bitcoin-testnet'),
          walletId: 'w2',
          blockchainName: 'Bitcoin',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('bitcoin-testnet4'),
        },
      ]),
    };

    const state = createState({
      rawTokensState,
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-764824073'),
          testnet: BlockchainNetworkId('cardano-1'),
        },
      },
    });

    const result =
      tokensSelectors.tokens.selectAggregatedFungibleTokensForVisibleAccounts(
        state,
      );

    expect(result).toHaveLength(1);
    expect(result[0].tokenId).toBe(TokenId('AAA'));
    expect(result[0].available).toEqual(BigNumber(3n));
  });
});

describe('selectTokenDistributionByTokenIdForVisibleAccounts', () => {
  it('returns only accounts visible on the current network', () => {
    const { rawTokensState } = buildTestScenario([
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-preprod'),
        address: 'addr-cardano-preprod' as Address,
        available: 1000n,
      },
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-preview'),
        address: 'addr-cardano-preview' as Address,
        available: 2000n,
      },
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-mainnet'),
        address: 'addr-cardano-mainnet' as Address,
        available: 5000n,
      },
    ]);

    const walletsEntities = {
      w1: createWallet('w1', [
        {
          accountId: AccountId('cardano-preprod'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preprod'),
          name: 'Preprod Account',
        },
        {
          accountId: AccountId('cardano-preview'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preview'),
          name: 'Preview Account',
        },
        {
          accountId: AccountId('cardano-mainnet'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-mainnet'),
          name: 'Mainnet Account',
        },
      ]),
    };

    // Test with testnet selected and preprod as the selected Cardano network
    const state = createState({
      rawTokensState,
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-mainnet'),
          testnet: BlockchainNetworkId('cardano-preprod'),
        },
      },
    });

    const result =
      tokensSelectors.tokens.selectTokenDistributionByTokenIdForVisibleAccounts(
        state,
        TokenId('AAA'),
      );

    // Should only return the preprod account, not preview or mainnet
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe('cardano-preprod');
    expect(result[0].accountName).toBe('Preprod Account');
    expect(result[0].balance).toBe(1000);
  });

  it('returns empty array when no accounts visible on current network have the token', () => {
    const { rawTokensState } = buildTestScenario([
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-preview'),
        address: 'addr-cardano-preview' as Address,
        available: 2000n,
      },
    ]);

    const walletsEntities = {
      w1: createWallet('w1', [
        {
          accountId: AccountId('cardano-preprod'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preprod'),
        },
        {
          accountId: AccountId('cardano-preview'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preview'),
        },
      ]),
    };

    // Select preprod but token only exists on preview
    const state = createState({
      rawTokensState,
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-mainnet'),
          testnet: BlockchainNetworkId('cardano-preprod'),
        },
      },
    });

    const result =
      tokensSelectors.tokens.selectTokenDistributionByTokenIdForVisibleAccounts(
        state,
        TokenId('AAA'),
      );

    expect(result).toHaveLength(0);
  });
});

describe('selectTokenDistributionWithTotalsForVisibleAccounts', () => {
  it('returns totals only for visible accounts', () => {
    const { rawTokensState } = buildTestScenario([
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-preprod'),
        address: 'addr-cardano-preprod' as Address,
        available: 1000n,
      },
      {
        tokenId: TokenId('AAA'),
        accountId: AccountId('cardano-preview'),
        address: 'addr-cardano-preview' as Address,
        available: 2000n,
      },
    ]);

    const walletsEntities = {
      w1: createWallet('w1', [
        {
          accountId: AccountId('cardano-preprod'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preprod'),
          name: 'Preprod Account',
        },
        {
          accountId: AccountId('cardano-preview'),
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-preview'),
          name: 'Preview Account',
        },
      ]),
    };

    const state = createState({
      rawTokensState,
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: {
          mainnet: BlockchainNetworkId('cardano-mainnet'),
          testnet: BlockchainNetworkId('cardano-preprod'),
        },
      },
    });

    const result =
      tokensSelectors.tokens.selectTokenDistributionWithTotalsForVisibleAccounts(
        state,
        TokenId('AAA'),
      );

    // Should only include preprod account
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0].accountId).toBe('cardano-preprod');
    expect(result.distribution[0].balance).toBe(1000);
    // Totals should only reflect preprod balance (returned as string)
    expect(result.totals?.total).toBe('1000');
  });
});
