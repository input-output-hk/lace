import { Cardano } from '@cardano-sdk/core';
import { BlockchainNetworkId } from '@lace-contract/network';
import { TokenId } from '@lace-contract/tokens';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber, HexBytes, Timestamp } from '@lace-sdk/util';

import {
  CardanoAccountId,
  LOVELACE_TOKEN_ID,
  CardanoPaymentAddress,
} from '../src';

import type {
  CardanoBip32AccountProps,
  CardanoTransactionHistoryItem,
} from '../src';
import type { GetTransactionDataParams } from '../src/store/helpers/get-transaction-summary-data';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { Address, AnyAddress } from '@lace-contract/addresses';
import type { RawToken, TokenContextData } from '@lace-contract/tokens';
import type {
  HardwareWallet,
  HardwareWalletAccount,
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

export const midnightAccount: InMemoryWalletAccount = {
  accountId: AccountId('mn1'),
  blockchainSpecific: {},
  networkType: 'testnet',
  blockchainNetworkId: BlockchainNetworkId('midnight-preview'),
  accountType: 'InMemory',
  blockchainName: 'Midnight',
  walletId: WalletId('mn1'),
  metadata: { name: 'mn1 acc' },
};
export const midnightWallet: InMemoryWallet = {
  accounts: [midnightAccount],
  blockchainSpecific: {},
  encryptedRecoveryPhrase: HexBytes('abc'),
  metadata: { name: 'mn1', order: 0 },
  type: WalletType.InMemory,
  walletId: WalletId('mn1'),
  isPassphraseConfirmed: true,
};

const cardanoWalletId = WalletId('cardano1');
export const threeAccountCardanoWalletAccounts: HardwareWalletAccount<CardanoBip32AccountProps>[] =
  [
    {
      blockchainName: 'Cardano',
      networkType: 'testnet',
      accountType: 'HardwareLedger',
      blockchainNetworkId: BlockchainNetworkId('cardano-1'),
      blockchainSpecific: {
        chainId: Cardano.ChainIds.Preprod,
        accountIndex: 0,
        extendedAccountPublicKey: 'twoAccountXpub0' as Bip32PublicKeyHex,
      },
      walletId: cardanoWalletId,
      accountId: CardanoAccountId(cardanoWalletId, 0, 1),
      metadata: { name: 'acc0' },
    },
    {
      blockchainName: 'Cardano',
      networkType: 'testnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-1'),
      accountType: 'HardwareLedger',
      blockchainSpecific: {
        accountIndex: 1,
        chainId: Cardano.ChainIds.Preprod,
        extendedAccountPublicKey: 'twoAccountXpub1' as Bip32PublicKeyHex,
      },
      walletId: cardanoWalletId,
      accountId: CardanoAccountId(cardanoWalletId, 1, 1),
      metadata: { name: 'acc1' },
    },
    {
      blockchainName: 'Cardano',
      networkType: 'testnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-1'),
      blockchainSpecific: {
        accountIndex: 2,
        chainId: Cardano.ChainIds.Preprod,
        extendedAccountPublicKey: 'twoAccountXpub2' as Bip32PublicKeyHex,
      },
      accountType: 'HardwareLedger',
      walletId: cardanoWalletId,
      accountId: CardanoAccountId(cardanoWalletId, 2, 1),
      metadata: { name: 'acc2' },
    },
  ];

export const previewAccountCardanoWalletAccounts: HardwareWalletAccount<CardanoBip32AccountProps>[] =
  [
    {
      blockchainName: 'Cardano',
      networkType: 'testnet',
      accountType: 'HardwareLedger',
      blockchainNetworkId: BlockchainNetworkId('cardano-2'),
      blockchainSpecific: {
        chainId: Cardano.ChainIds.Preview,
        accountIndex: 0,
        extendedAccountPublicKey: 'previewAccountXpub0' as Bip32PublicKeyHex,
      },
      walletId: cardanoWalletId,
      accountId: CardanoAccountId(cardanoWalletId, 0, 2),
      metadata: { name: 'acc4' },
    },
  ];

export const threeAccountCardanoWallet: HardwareWallet<CardanoBip32AccountProps> =
  {
    accounts: threeAccountCardanoWalletAccounts,
    blockchainSpecific: {},
    metadata: { name: 'cardano1', order: 1 },
    type: WalletType.HardwareLedger,
    walletId: cardanoWalletId,
  };

export const chainId = Cardano.ChainIds.Preprod;

export const midnightAddress: AnyAddress = {
  name: 'mn0',
  address: 'mn_addr...' as Address,
  blockchainName: 'Midnight',
  accountId: AccountId('mn-acc..'),
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

export const cardanoAccount0Addr: AnyAddress = {
  name: 'cardano0',
  address: CardanoPaymentAddress(
    'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
  ),
  blockchainName: 'Cardano',
  accountId: CardanoAccountId(
    threeAccountCardanoWallet.walletId,
    0,
    chainId.networkMagic,
  ),
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

export const cardanoAccount1Addr: AnyAddress = {
  name: 'cardano1',
  address: CardanoPaymentAddress(
    'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
  ),
  blockchainName: 'Cardano',
  accountId: CardanoAccountId(
    threeAccountCardanoWallet.walletId,
    1,
    chainId.networkMagic,
  ),
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

export const cardanoAccount2Addr1: AnyAddress = {
  name: 'cardano21',
  address: CardanoPaymentAddress(
    'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
  ),
  blockchainName: 'Cardano',
  accountId: CardanoAccountId(
    threeAccountCardanoWallet.walletId,
    2,
    chainId.networkMagic,
  ),
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

export const cardanoAccount2Addr2: AnyAddress = {
  name: 'cardano22',
  address: CardanoPaymentAddress(
    'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
  ),
  blockchainName: 'Cardano',
  accountId: CardanoAccountId(
    threeAccountCardanoWallet.walletId,
    2,
    chainId.networkMagic,
  ),
  data: {
    networkId: chainId.networkId,
    networkMagic: chainId.networkMagic,
  },
};

export const cardanoAccountPreviewAddr0: AnyAddress = {
  name: 'cardanoPreview0',
  address: CardanoPaymentAddress(
    'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g',
  ),
  blockchainName: 'Cardano',
  accountId: CardanoAccountId(
    previewAccountCardanoWalletAccounts[0].walletId,
    0,
    Cardano.ChainIds.Preview.networkMagic,
  ),
  data: {
    networkId: Cardano.ChainIds.Preview.networkId,
    networkMagic: Cardano.ChainIds.Preview.networkMagic,
  },
};

export const midnightAccountContext: TokenContextData = {
  accountId: midnightAddress.accountId,
  address: midnightAddress.address,
  blockchainName: 'Midnight',
};

export const midnightDustTokens: RawToken = {
  ...midnightAccountContext,
  available: BigNumber(123n),
  pending: BigNumber(0n),
  tokenId: TokenId('DUST'),
};

export const account0Context: TokenContextData = {
  accountId: cardanoAccount0Addr.accountId,
  address: cardanoAccount0Addr.address,
  blockchainName: 'Cardano',
};

export const account0someAdaTokens: RawToken = {
  ...account0Context,
  available: BigNumber(123n),
  pending: BigNumber(0n),
  tokenId: LOVELACE_TOKEN_ID,
};

export const account1Context: TokenContextData = {
  accountId: cardanoAccount1Addr.accountId,
  address: cardanoAccount1Addr.address,
  blockchainName: 'Cardano',
};

export const account1someAdaTokens: RawToken = {
  ...account1Context,
  available: BigNumber(123n),
  pending: BigNumber(0n),
  tokenId: LOVELACE_TOKEN_ID,
};

export const account1someOtherTokens: RawToken = {
  ...account1Context,
  available: BigNumber(123n),
  pending: BigNumber(0n),
  tokenId: TokenId('OTHER_TOKEN_ID'),
};

export const account4Context: TokenContextData = {
  accountId: cardanoAccountPreviewAddr0.accountId,
  address: cardanoAccountPreviewAddr0.address,
  blockchainName: 'Cardano',
};

export const account4SomeAdaTokens: RawToken = {
  ...account4Context,
  available: BigNumber(123n),
  pending: BigNumber(0n),
  tokenId: LOVELACE_TOKEN_ID,
};

export const tip1 = { blockNo: 1 } as Cardano.Tip;
export const tip2 = { blockNo: 2 } as Cardano.Tip;

export const createTransactionHistoryItem = ({
  id,
  blockTime,
  txIndex = 0,
  blockNumber = 0,
}: {
  id: string;
  blockTime: number;
  txIndex?: number;
  blockNumber?: number;
}): CardanoTransactionHistoryItem => ({
  txId: Cardano.TransactionId(id),
  // TODO: make configurable
  txIndex: Cardano.TxIndex(txIndex),
  blockNumber: Cardano.BlockNo(blockNumber),
  blockTime: Timestamp(blockTime),
});

export const outgoingTransactionOutput: GetTransactionDataParams = {
  addrInputs: [],
  addrOutputs: [
    {
      amount: 3n,
      assetList: [],
      addr: 'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
    },
    {
      amount: 279n,
      assetList: [],
      addr: 'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
    },
  ],
  accountAddresses: [
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
  ],
  isIncomingTransaction: false,
};

export const incomingTransactionOutput: GetTransactionDataParams = {
  addrInputs: [
    {
      amount: 58389439n,
      assetList: [],
      addr: 'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
    },
  ],
  addrOutputs: [
    {
      amount: 1000n,
      assetList: [],
      addr: 'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
    },
    {
      amount: 58389439n,
      assetList: [],
      addr: 'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq',
    },
  ],
  accountAddresses: [
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95',
  ],
  isIncomingTransaction: true,
};

// Cardano UTxOs:

export const utxo1: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    txId: Cardano.TransactionId(
      '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    value: {
      coins: BigInt(10),
      assets: new Map(),
    },
  },
];
export const utxo2: Cardano.Utxo = [
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    txId: Cardano.TransactionId(
      '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
    ),
    index: 1,
  },
  {
    address: Cardano.PaymentAddress(
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    ),
    value: {
      coins: BigInt(5),
      assets: new Map(),
    },
  },
];
