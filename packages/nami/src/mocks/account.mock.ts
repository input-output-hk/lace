/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { network } from './network.mock';

import type { Account } from 'ui/app/pages/wallet.types';

/* eslint-disable unicorn/no-null */
export const account = {
  avatar: '0.32533156086782333',
  index: 0,
  mainnet: {
    assets: [],
    history: { confirmed: [], details: {} },
    lovelace: '0',
    minAda: 0,
    paymentAddr:
      'addr1q850c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444qjgrvm5',
    rewardAddr: 'stake1u9s75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666ss54s67',
  },
  name: 'nami',
  paymentKeyHash: 'e8fc28480c73486d288074c5ac7660ad0611ae5ce505de1943534669',
  paymentKeyHashBech32:
    'addr_vkh1ar7zsjqvwdyx62yqwnz6canq45rprtjuu5zaux2r2drxjlwvm2w',
  collateral: {
    lovelace: '5000000',
    txHash: 'a399e301967b7b69d4d422300db14310ebe4db2355d350949be37bda5ec3e311',
    txId: 0,
  },
  preprod: {
    assets: [
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743230',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '10',
        unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f4d657368546f6b656e',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '9',
        unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: '2660d5a40acd9d93945c5f44352d34867241826ffbc7bdcaa6a30bea574e4654',
      },
      {
        decimals: 6,
        has_nft_onchain_metadata: false,
        quantity: '9000000',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '10999999',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
      },
      {
        decimals: 6,
        has_nft_onchain_metadata: false,
        quantity: '4000000',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
      },
      {
        decimals: 6,
        has_nft_onchain_metadata: false,
        quantity: '9000000',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '10999999',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f31',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f313030',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3233',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3234',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3238',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3338',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3435',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3437',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406b6c6f73',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: true,
        quantity: '1',
        unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406e69747069636b6572',
      },
      {
        decimals: 0,
        has_nft_onchain_metadata: false,
        quantity: '101',
        unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
      },
      {
        decimals: 6,
        has_nft_onchain_metadata: false,
        quantity: '22471977',
        unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
      },
    ],
    history: {
      confirmed: [
        '05dfe1e6d96f93f47d78c9a5df771efa6a57cfa357e8c36842c1068311a9354f',
        'e69ef6b084344f1e2601a31a9406e3f903763f3eae61c1963b958de600760396',
        'ca309a05c952d9101ac6ef8e9a75e4c0ded267c8c86e24bec684347b1e7f2ad7',
        'd4dc677aea911dddf7a631937dd3f2984648cb112f1eec25da9fdcdf5e3dc4e6',
        '41a327218abf9d572695c6835afe62008f83c6a131107a8fbc6f085cee6bde20',
      ],
      details: {},
    },
    lastUpdate:
      '05dfe1e6d96f93f47d78c9a5df771efa6a57cfa357e8c36842c1068311a9354f',
    lovelace: '12737296152',
    minAda: '3521270',
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
    recentSendToAddresses: [
      'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
    ],
  },
  preview: {
    assets: [],
    history: { confirmed: [], details: {} },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  },
  publicKey:
    '39e5f17597c93447e77d2ec9e1f76d7b9be9bf21eacc92b695d39a3c0d85d3d2b1c7cb7d73ae1ae31adbb133ceced87f71cd41398994a8684129f8e1d20f1f74',
  stakeKeyHash: '61ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a',
  testnet: {
    assets: [],
    history: { confirmed: [], details: {} },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  },
  paymentAddr:
    'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
  rewardAddr:
    'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  assets: [
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743230',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: '0b23996b05afb3a76cc802dcb1d854a2b3596b208bf775c162cec2d34e6f6e5371756172654e66743235',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '10',
      unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f4d657368546f6b656e',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '9',
      unit: '212a16adbc2aec5cab350fc8e8a32defae6d766f7a774142d5ae995f54657374546f6b656e',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: '2660d5a40acd9d93945c5f44352d34867241826ffbc7bdcaa6a30bea574e4654',
    },
    {
      decimals: 6,
      has_nft_onchain_metadata: false,
      quantity: '9000000',
      unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198444149',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '10999999',
      unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
    },
    {
      decimals: 6,
      has_nft_onchain_metadata: false,
      quantity: '4000000',
      unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534443',
    },
    {
      decimals: 6,
      has_nft_onchain_metadata: false,
      quantity: '9000000',
      unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19855534454',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '10999999',
      unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff19869555344',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f31',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f313030',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3233',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3234',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3238',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3338',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3435',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'c4c0005b4e9ae69cd30bcfd8c3d2c953ac5d12f7255e319aba8f19ea546573744275647a50726570726f645f3437',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'e517b38693b633f1bc0dd3eb69cb1ad0f0c198c67188405901ae63a3001bc28068616e646c65735f6e61747572652d6c616b65',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406b6c6f73',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: true,
      quantity: '1',
      unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406e69747069636b6572',
    },
    {
      decimals: 0,
      has_nft_onchain_metadata: false,
      quantity: '101',
      unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
    },
    {
      decimals: 6,
      has_nft_onchain_metadata: false,
      quantity: '22471977',
      unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e3744d494e',
    },
  ],
  lovelace: '12737296152',
  minAda: '3521270',
  history: {
    confirmed: [
      '05dfe1e6d96f93f47d78c9a5df771efa6a57cfa357e8c36842c1068311a9354f',
      'e69ef6b084344f1e2601a31a9406e3f903763f3eae61c1963b958de600760396',
      'ca309a05c952d9101ac6ef8e9a75e4c0ded267c8c86e24bec684347b1e7f2ad7',
      'd4dc677aea911dddf7a631937dd3f2984648cb112f1eec25da9fdcdf5e3dc4e6',
      '41a327218abf9d572695c6835afe62008f83c6a131107a8fbc6f085cee6bde20',
    ],
    details: {},
  },
} as unknown as Account;

export const account1 = {
  avatar: '0.5083171879555981',
  index: 1,
  mainnet: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr1qxnkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tq2wm0wx',
    rewardAddr: 'stake1uyxvu9gkqfqs08p8ys0re26ntzzdp5d2c6gtqc9afw8e24suyq8pf',
  },
  name: 'account 2',
  paymentKeyHash: 'a764bab46dd761e93a7dd0ed0ecbd8bbefffddc5c8c53bcc81956bdf',
  paymentKeyHashBech32:
    'addr_vkh15ajt4drd6as7jwna6rksaj7ch0hllhw9erznhnypj44a70y6zuk',
  preprod: {
    lovelace: '9996976475',
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    minAda: 0,
    paymentAddr:
      'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
    rewardAddr:
      'stake_test1uqxvu9gkqfqs08p8ys0re26ntzzdp5d2c6gtqc9afw8e24smw2995',
  },
  preview: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
    rewardAddr:
      'stake_test1uqxvu9gkqfqs08p8ys0re26ntzzdp5d2c6gtqc9afw8e24smw2995',
  },
  publicKey:
    'b6d36cedfc237e41921d586865864474564826daacfef9e1f605c79470bea4a0f1b8ab532c1760832e99e59f0c582723d631e120bb17659159cea8e180f0d0df',
  stakeKeyHash: '0cce15160241079c27241e3cab535884d0d1aac690b060bd4b8f9556',
  testnet: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
    rewardAddr:
      'stake_test1uqxvu9gkqfqs08p8ys0re26ntzzdp5d2c6gtqc9afw8e24smw2995',
  },
  paymentAddr:
    'addr_test1qznkfw45dhtkr6f60hgw6rktmza7ll7achyv2w7vsx2khhcvec23vqjpq7wzwfq78j44xkyy6rg6435skpst6ju0j4tqfcx0ze',
  rewardAddr:
    'stake_test1uqxvu9gkqfqs08p8ys0re26ntzzdp5d2c6gtqc9afw8e24smw2995',
  assets: [],
  lovelace: '9996976475',
  minAda: 0,
  history: {
    confirmed: [],
    details: {},
  },
};

export const accountHW = {
  avatar: '0.5609736852739162',
  index: 'ledger-20501-2',
  mainnet: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr1q850c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444qjgrvm5',
    rewardAddr: 'stake1u9s75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666ss54s67',
  },
  name: 'Ledger 3',
  paymentKeyHash: 'a764bab46dd761e93a7dd0ed0ecbd8bbefffddc5c8c53bcc81956bdf',
  paymentKeyHashBech32:
    'addr_vkh15ajt4drd6as7jwna6rksaj7ch0hllhw9erznhnypj44a70y6zuk',
  preprod: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  },
  preview: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  },
  publicKey:
    '39e5f17597c93447e77d2ec9e1f76d7b9be9bf21eacc92b695d39a3c0d85d3d2b1c7cb7d73ae1ae31adbb133ceced87f71cd41398994a8684129f8e1d20f1f74',
  stakeKeyHash: '61ea70af1de71795df52e62d1c0f2c8817f13b5cd4b40e04cab5ad6a',
  testnet: {
    assets: [],
    history: {
      confirmed: [],
      details: {},
    },
    lovelace: null,
    minAda: 0,
    paymentAddr:
      'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
    rewardAddr:
      'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  },
  paymentAddr:
    'addr_test1qr50c2zgp3e5smfgsp6vttrkvzksvydwtnjsthsegdf5v6tpafc27808z72a75hx95wq7tygzlcnkhx5ks8qfj44444q377vht',
  rewardAddr:
    'stake_test1ups75u90rhn309wl2tnz68q09jyp0ufmtn2tgrsye26666sh7lj7r',
  assets: [],
  lovelace: null,
  minAda: 0,
  history: {
    confirmed: [],
    details: {},
  },
};

export const currentAccount = {
  ...account,
  assets: account[network.id].assets,
  lovelace: account[network.id].lovelace,
  history: account[network.id].history,
  minAda: account[network.id].minAda,
  collateral: account[network.id].collateral,
  recentSendToAddresses: account[network.id].recentSendToAddresses,
  paymentAddr: account[network.id].paymentAddr,
  rewardAddr: account[network.id].rewardAddr,
};

export const account2 = {
  avatar: '0.7267421825241898',
  index: 0,
  name: 'Test',
  paymentKeyHash: '37f60ad7e24cf496ac02d30da7be208cb703e7474fd05096d70a744e',
  paymentKeyHashBech32:
    'addr_vkh1xlmq44lzfn6fdtqz6vx6003q3jms8e68flg9p9khpf6yu6uewvu',
  assets: [
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2',
      unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '1',
      unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '1',
      unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2',
      unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2',
      unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2',
      unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '8704538763',
      unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '67280096',
      unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2',
      unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
    },
    {
      decimals: null,
      has_nft_onchain_metadata: false,
      quantity: '2253633',
      unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
    },
  ],
  history: {
    confirmed: [
      'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
      '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
      '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
      '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
      '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
    ],
    details: {
      '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80': {
        block: {
          block_vrf:
            'vrf_vk1sn75n6qtvl3shetj7cv4tly7jsphu48pf832vxadklvgd0tf3cks4mqvdf',
          confirmations: 102_751,
          epoch: 145,
          epoch_slot: 216_495,
          fees: '173861',
          hash: '8db33ca759f111dba30a07b2cee0c6fcab1db613579c46c9ff8b31a3afcb28bc',
          height: 2_293_683,
          next_block:
            '0f2ce5434f4b92140150da8d1dc1dd7c872ae27ba06b4d7d15674f07045a5bdd',
          op_cert:
            'f2b4e41d64d8f502b16b31a51c60862fe3118b97452d924569ba45e91aff6d5e',
          op_cert_counter: '2',
          output: '2621219',
          previous_block:
            '022f736a0c92ab1508f01c7c68c76dc328fd0fcacb5eba81a9094ac4301ee395',
          size: 419,
          slot: 61_214_895,
          slot_leader:
            'pool1pzdqdxrv0k74p4q33y98f2u7vzaz95et7mjeedjcfy0jcgk754f',
          time: 1_716_898_095,
          tx_count: 1,
        },
        info: {
          asset_mint_or_burn_count: 0,
          block:
            '8db33ca759f111dba30a07b2cee0c6fcab1db613579c46c9ff8b31a3afcb28bc',
          block_height: 2_293_683,
          block_time: 1_716_898_095,
          delegation_count: 0,
          deposit: '0',
          fees: '173861',
          hash: '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
          index: 0,
          invalid_before: null,
          invalid_hereafter: '61222067',
          mir_cert_count: 0,
          output_amount: [
            {
              quantity: '2621219',
              unit: 'lovelace',
            },
          ],
          pool_retire_count: 0,
          pool_update_count: 0,
          redeemer_count: 0,
          size: 415,
          slot: 61_214_895,
          stake_cert_count: 0,
          utxo_count: 4,
          valid_contract: true,
          withdrawal_count: 0,
        },
        metadata: [
          {
            json_metadata: {
              msg: 'Hey',
            },
            label: '674',
          },
        ],
        utxos: {
          hash: '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
          inputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1155080',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
            },
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1640000',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
            },
          ],
          outputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1000000',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference_script_hash: null,
            },
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
              amount: [
                {
                  quantity: '1621219',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference_script_hash: null,
            },
          ],
        },
      },
      '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189': {
        block: {
          block_vrf:
            'vrf_vk17ktudgvcvmq9yydx0xfd0e0luc7h6h8eupsmwasyrzv0l4cn3qhsgcmq4r',
          confirmations: 148_320,
          epoch: 143,
          epoch_slot: 49_651,
          fees: '173729',
          hash: '272b49a143df975fd588c77ccbabc08c4872b324905b5567b66c09d4cb589c89',
          height: 2_248_114,
          next_block:
            'eb693c753ec7a4d452868a8e72dc68bb80c712c36664ee22e0e6f5585ce66a4c',
          op_cert:
            'b40fb753f7d498a38fa5b37463fce241366f5e05b573afb080f42338e52b91ca',
          op_cert_counter: '7',
          output: '20831931',
          previous_block:
            '6ce6739a0c719f2026a5d6170cea8c685d651a0d71f864f1c486fdf43b8920e7',
          size: 416,
          slot: 60_184_051,
          slot_leader:
            'pool1e0arfuamnymdkmjztvkryasxv9d8u8key27ajgc4mquz2nr8mk9',
          time: 1_715_867_251,
          tx_count: 1,
        },
        info: {
          asset_mint_or_burn_count: 0,
          block:
            '272b49a143df975fd588c77ccbabc08c4872b324905b5567b66c09d4cb589c89',
          block_height: 2_248_114,
          block_time: 1_715_867_251,
          delegation_count: 0,
          deposit: '0',
          fees: '173729',
          hash: '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
          index: 0,
          invalid_before: null,
          invalid_hereafter: '60191164',
          mir_cert_count: 0,
          output_amount: [
            {
              quantity: '20831931',
              unit: 'lovelace',
            },
          ],
          pool_retire_count: 0,
          pool_update_count: 0,
          redeemer_count: 0,
          size: 412,
          slot: 60_184_051,
          stake_cert_count: 0,
          utxo_count: 4,
          valid_contract: true,
          withdrawal_count: 0,
        },
        metadata: [],
        utxos: {
          hash: '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
          inputs: [
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '18830011',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                'cd71358d9a22f4e80049dc3fba8b2326da3309af1cd3c82b5a9ffa214cef78eb',
            },
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '2175649',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                'f54b26026041d7c22558b308d32bbe764a7bc1645381ea5e131294480afbe31b',
            },
          ],
          outputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1180940',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference_script_hash: null,
            },
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '19650991',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference_script_hash: null,
            },
          ],
        },
      },
      '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3': {
        block: {
          block_vrf:
            'vrf_vk1xn0x245vgc9rszy4wmk90glqfrrtr4v55tc4n975l6lrm935w56sddm59f',
          confirmations: 148_317,
          epoch: 143,
          epoch_slot: 49_687,
          fees: '173465',
          hash: '5b4653e515d592318976e22e718d6408948f85c1b2a56f26fe751f696c1c677d',
          height: 2_248_117,
          next_block:
            '04c583875f9821b9a66d10b619f535eafd0a4368438846faca6573d1ec2fa70f',
          op_cert:
            'ed3a94b721049068abcd5e5d0fabf23404f5d0bc9d348a2181a5d3017ce65d54',
          op_cert_counter: '6',
          output: '12981615',
          previous_block:
            '3660eb4ef01bf9bdfb335567f0c716e71707b1509eacfd8c417d908c82f1ae91',
          size: 410,
          slot: 60_184_087,
          slot_leader:
            'pool1egfg26w0syqly9qc65hz33gqv2qrzyka8tfue3ccsk3c73a56jp',
          time: 1_715_867_287,
          tx_count: 1,
        },
        info: {
          asset_mint_or_burn_count: 0,
          block:
            '5b4653e515d592318976e22e718d6408948f85c1b2a56f26fe751f696c1c677d',
          block_height: 2_248_117,
          block_time: 1_715_867_287,
          delegation_count: 0,
          deposit: '0',
          fees: '173465',
          hash: '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
          index: 0,
          invalid_before: null,
          invalid_hereafter: '60191251',
          mir_cert_count: 0,
          output_amount: [
            {
              quantity: '12981615',
              unit: 'lovelace',
            },
          ],
          pool_retire_count: 0,
          pool_update_count: 0,
          redeemer_count: 0,
          size: 406,
          slot: 60_184_087,
          stake_cert_count: 0,
          utxo_count: 4,
          valid_contract: true,
          withdrawal_count: 0,
        },
        metadata: [],
        utxos: {
          hash: '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
          inputs: [
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '12000000',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '87c3e3e91ca613e1b0687704112d6de386c1635d596cbc9bd21326a3f9a00589',
            },
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '1155080',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '928cc1453d0f956fca3b4359aad057e8e3872befc8ec92988bdc9f91c1e40271',
            },
          ],
          outputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1155080',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference_script_hash: null,
            },
            {
              address:
                'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
              amount: [
                {
                  quantity: '11826535',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference_script_hash: null,
            },
          ],
        },
      },
      c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224: {
        block: {
          block_vrf:
            'vrf_vk1zqpmsxhsn39vk4fwp7an8llpys2nvreggtqwqg93rvyuhqhhchjq0gqduw',
          confirmations: 98_318,
          epoch: 145,
          epoch_slot: 313_636,
          fees: '1070472',
          hash: '932f3f1422722ff85b96d5d74ae9b567f09302c18c12dc8c6c051563b896bc82',
          height: 2_298_116,
          next_block:
            '5963f363e2dba7cf3a7cbd25219aaf449b9040e2d98f3ae16dac2ea99d6c1e44',
          op_cert:
            '4a75bb54a40c6f3267c88aa4dc791c15b8ddaae44765b9dfb397458895568dbd',
          op_cert_counter: '5',
          output: '20520857236',
          previous_block:
            'e6594b265b304a781337fcd0a87202105082724773d3ccd7e4d2fd028a79fc1c',
          size: 3584,
          slot: 61_312_036,
          slot_leader:
            'pool13m26ky08vz205232k20u8ft5nrg8u68klhn0xfsk9m4gsqsc44v',
          time: 1_716_995_236,
          tx_count: 3,
        },
        info: {
          asset_mint_or_burn_count: 0,
          block:
            '932f3f1422722ff85b96d5d74ae9b567f09302c18c12dc8c6c051563b896bc82',
          block_height: 2_298_116,
          block_time: 1_716_995_236,
          delegation_count: 0,
          deposit: '0',
          fees: '210161',
          hash: 'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
          index: 2,
          invalid_before: null,
          invalid_hereafter: '61319212',
          mir_cert_count: 0,
          output_amount: [
            {
              quantity: '19211824041',
              unit: 'lovelace',
            },
            {
              quantity: '2',
              unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
            },
            {
              quantity: '1',
              unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
            },
            {
              quantity: '1',
              unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
            },
            {
              quantity: '2',
              unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
            },
            {
              quantity: '2',
              unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
            },
            {
              quantity: '2',
              unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
            },
            {
              quantity: '8704538763',
              unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
            },
            {
              quantity: '67280096',
              unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
            },
            {
              quantity: '2',
              unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
            },
            {
              quantity: '2253633',
              unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
            },
          ],
          pool_retire_count: 0,
          pool_update_count: 0,
          redeemer_count: 0,
          size: 1240,
          slot: 61_312_036,
          stake_cert_count: 0,
          utxo_count: 4,
          valid_contract: true,
          withdrawal_count: 0,
        },
        metadata: [],
        utxos: {
          hash: 'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
          inputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
              amount: [
                {
                  quantity: '1621219',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
            },
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '19210412983',
                  unit: 'lovelace',
                },
                {
                  quantity: '2',
                  unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
                },
                {
                  quantity: '1',
                  unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
                },
                {
                  quantity: '1',
                  unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
                },
                {
                  quantity: '2',
                  unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
                },
                {
                  quantity: '2',
                  unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
                },
                {
                  quantity: '2',
                  unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
                },
                {
                  quantity: '8704538763',
                  unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
                },
                {
                  quantity: '67280096',
                  unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
                },
                {
                  quantity: '2',
                  unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
                },
                {
                  quantity: '2253633',
                  unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '8bf11536a35d9a2fa6a5189a926c53a5c9484c016fdc0ccd2363a8a661898115',
            },
          ],
          outputs: [
            {
              address:
                'addr_test1qr6a0lr6atpagle72hx6g5c5v27hxn4k27qcwzv26r7ednvzj3tw59zn62kup4fwx2zhl454anu8wtalrusr77s4q4gsat87h2',
              amount: [
                {
                  quantity: '2000000000',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference_script_hash: null,
            },
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
              amount: [
                {
                  quantity: '17211824041',
                  unit: 'lovelace',
                },
                {
                  quantity: '2',
                  unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
                },
                {
                  quantity: '1',
                  unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
                },
                {
                  quantity: '1',
                  unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
                },
                {
                  quantity: '2',
                  unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
                },
                {
                  quantity: '2',
                  unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
                },
                {
                  quantity: '2',
                  unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
                },
                {
                  quantity: '8704538763',
                  unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
                },
                {
                  quantity: '67280096',
                  unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
                },
                {
                  quantity: '2',
                  unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
                },
                {
                  quantity: '2253633',
                  unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference_script_hash: null,
            },
          ],
        },
      },
      '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21': {
        block: {
          block_vrf:
            'vrf_vk18xtl3n0yawku3xflkrnnez98qk8vpzdxxywvr7fs8z9ez98u8jvs99znjq',
          confirmations: 169_687,
          epoch: 141,
          epoch_slot: 405_690,
          fees: '1167560',
          hash: '78cb8b75d0fe9ead9fae1d588f3f8d306f5d1d55579b98c0a7c8af6434ad25b4',
          height: 2_226_747,
          next_block:
            '7dfa05e5405562d41e81774cdbfec1ef99428710b64d2442eec0efcf6315052d',
          op_cert:
            '75d4f6f7a12cd70d6aafdaa272ca27b5606c9a16a560e696cc7f1aa551491a9d',
          op_cert_counter: '6',
          output: '48773920',
          previous_block:
            'f9541f5b0d316cb8d3f8c3cbf3888f3cd6a73369f2fedc61fa7398d02e14d427',
          size: 11_760,
          slot: 59_676_090,
          slot_leader:
            'pool13la5erny3srx9u4fz9tujtl2490350f89r4w4qjhk0vdjmuv78v',
          time: 1_715_359_290,
          tx_count: 3,
        },
        info: {
          asset_mint_or_burn_count: 0,
          block:
            '78cb8b75d0fe9ead9fae1d588f3f8d306f5d1d55579b98c0a7c8af6434ad25b4',
          block_height: 2_226_747,
          block_time: 1_715_359_290,
          delegation_count: 0,
          deposit: '0',
          fees: '177557',
          hash: '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
          index: 2,
          invalid_before: null,
          invalid_hereafter: '59683243',
          mir_cert_count: 0,
          output_amount: [
            {
              quantity: '3199212',
              unit: 'lovelace',
            },
            {
              quantity: '10000',
              unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
            },
            {
              quantity: '1',
              unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
            },
            {
              quantity: '2',
              unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
            },
          ],
          pool_retire_count: 0,
          pool_update_count: 0,
          redeemer_count: 0,
          size: 499,
          slot: 59_676_090,
          stake_cert_count: 0,
          utxo_count: 4,
          valid_contract: true,
          withdrawal_count: 0,
        },
        metadata: [],
        utxos: {
          hash: '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
          inputs: [
            {
              address:
                'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
              amount: [
                {
                  quantity: '2407019',
                  unit: 'lovelace',
                },
                {
                  quantity: '10000',
                  unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
                },
                {
                  quantity: '1',
                  unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
                },
                {
                  quantity: '2',
                  unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '1114419daf15ba0be827ae88e29bf0ae8101a66913e510f5716ca9117bc17f6e',
            },
            {
              address:
                'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
              amount: [
                {
                  quantity: '969750',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference: false,
              reference_script_hash: null,
              tx_hash:
                '2b98c1e09195aa75fda3cd3ada85fdc33947e9eab1f4532efe7e080604a9da7d',
            },
          ],
          outputs: [
            {
              address:
                'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
              amount: [
                {
                  quantity: '1640000',
                  unit: 'lovelace',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 0,
              reference_script_hash: null,
            },
            {
              address:
                'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
              amount: [
                {
                  quantity: '1559212',
                  unit: 'lovelace',
                },
                {
                  quantity: '10000',
                  unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
                },
                {
                  quantity: '1',
                  unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
                },
                {
                  quantity: '2',
                  unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
                },
              ],
              collateral: false,
              data_hash: null,
              inline_datum: null,
              output_index: 1,
              reference_script_hash: null,
            },
          ],
        },
      },
    },
  },
  preprod: {
    assets: [
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2',
        unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '1',
        unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '1',
        unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2',
        unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2',
        unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2',
        unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '8704538763',
        unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '67280096',
        unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2',
        unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
      },
      {
        decimals: null,
        has_nft_onchain_metadata: false,
        quantity: '2253633',
        unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
      },
    ],
    history: {
      confirmed: [
        'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
        '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
        '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
        '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
        '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
      ],
      details: {
        '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80': {
          block: {
            block_vrf:
              'vrf_vk1sn75n6qtvl3shetj7cv4tly7jsphu48pf832vxadklvgd0tf3cks4mqvdf',
            confirmations: 102_751,
            epoch: 145,
            epoch_slot: 216_495,
            fees: '173861',
            hash: '8db33ca759f111dba30a07b2cee0c6fcab1db613579c46c9ff8b31a3afcb28bc',
            height: 2_293_683,
            next_block:
              '0f2ce5434f4b92140150da8d1dc1dd7c872ae27ba06b4d7d15674f07045a5bdd',
            op_cert:
              'f2b4e41d64d8f502b16b31a51c60862fe3118b97452d924569ba45e91aff6d5e',
            op_cert_counter: '2',
            output: '2621219',
            previous_block:
              '022f736a0c92ab1508f01c7c68c76dc328fd0fcacb5eba81a9094ac4301ee395',
            size: 419,
            slot: 61_214_895,
            slot_leader:
              'pool1pzdqdxrv0k74p4q33y98f2u7vzaz95et7mjeedjcfy0jcgk754f',
            time: 1_716_898_095,
            tx_count: 1,
          },
          info: {
            asset_mint_or_burn_count: 0,
            block:
              '8db33ca759f111dba30a07b2cee0c6fcab1db613579c46c9ff8b31a3afcb28bc',
            block_height: 2_293_683,
            block_time: 1_716_898_095,
            delegation_count: 0,
            deposit: '0',
            fees: '173861',
            hash: '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
            index: 0,
            invalid_before: null,
            invalid_hereafter: '61222067',
            mir_cert_count: 0,
            output_amount: [
              {
                quantity: '2621219',
                unit: 'lovelace',
              },
            ],
            pool_retire_count: 0,
            pool_update_count: 0,
            redeemer_count: 0,
            size: 415,
            slot: 61_214_895,
            stake_cert_count: 0,
            utxo_count: 4,
            valid_contract: true,
            withdrawal_count: 0,
          },
          metadata: [
            {
              json_metadata: {
                msg: 'Hey',
              },
              label: '674',
            },
          ],
          utxos: {
            hash: '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
            inputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1155080',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
              },
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1640000',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
              },
            ],
            outputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1000000',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference_script_hash: null,
              },
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
                amount: [
                  {
                    quantity: '1621219',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference_script_hash: null,
              },
            ],
          },
        },
        '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189': {
          block: {
            block_vrf:
              'vrf_vk17ktudgvcvmq9yydx0xfd0e0luc7h6h8eupsmwasyrzv0l4cn3qhsgcmq4r',
            confirmations: 148_320,
            epoch: 143,
            epoch_slot: 49_651,
            fees: '173729',
            hash: '272b49a143df975fd588c77ccbabc08c4872b324905b5567b66c09d4cb589c89',
            height: 2_248_114,
            next_block:
              'eb693c753ec7a4d452868a8e72dc68bb80c712c36664ee22e0e6f5585ce66a4c',
            op_cert:
              'b40fb753f7d498a38fa5b37463fce241366f5e05b573afb080f42338e52b91ca',
            op_cert_counter: '7',
            output: '20831931',
            previous_block:
              '6ce6739a0c719f2026a5d6170cea8c685d651a0d71f864f1c486fdf43b8920e7',
            size: 416,
            slot: 60_184_051,
            slot_leader:
              'pool1e0arfuamnymdkmjztvkryasxv9d8u8key27ajgc4mquz2nr8mk9',
            time: 1_715_867_251,
            tx_count: 1,
          },
          info: {
            asset_mint_or_burn_count: 0,
            block:
              '272b49a143df975fd588c77ccbabc08c4872b324905b5567b66c09d4cb589c89',
            block_height: 2_248_114,
            block_time: 1_715_867_251,
            delegation_count: 0,
            deposit: '0',
            fees: '173729',
            hash: '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
            index: 0,
            invalid_before: null,
            invalid_hereafter: '60191164',
            mir_cert_count: 0,
            output_amount: [
              {
                quantity: '20831931',
                unit: 'lovelace',
              },
            ],
            pool_retire_count: 0,
            pool_update_count: 0,
            redeemer_count: 0,
            size: 412,
            slot: 60_184_051,
            stake_cert_count: 0,
            utxo_count: 4,
            valid_contract: true,
            withdrawal_count: 0,
          },
          metadata: [],
          utxos: {
            hash: '3e0e7f8ae7732277ec14c87b58b7c6bbc641aa1b70bfe198f30d74733aeaf189',
            inputs: [
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '18830011',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  'cd71358d9a22f4e80049dc3fba8b2326da3309af1cd3c82b5a9ffa214cef78eb',
              },
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '2175649',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  'f54b26026041d7c22558b308d32bbe764a7bc1645381ea5e131294480afbe31b',
              },
            ],
            outputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1180940',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference_script_hash: null,
              },
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '19650991',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference_script_hash: null,
              },
            ],
          },
        },
        '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3': {
          block: {
            block_vrf:
              'vrf_vk1xn0x245vgc9rszy4wmk90glqfrrtr4v55tc4n975l6lrm935w56sddm59f',
            confirmations: 148_317,
            epoch: 143,
            epoch_slot: 49_687,
            fees: '173465',
            hash: '5b4653e515d592318976e22e718d6408948f85c1b2a56f26fe751f696c1c677d',
            height: 2_248_117,
            next_block:
              '04c583875f9821b9a66d10b619f535eafd0a4368438846faca6573d1ec2fa70f',
            op_cert:
              'ed3a94b721049068abcd5e5d0fabf23404f5d0bc9d348a2181a5d3017ce65d54',
            op_cert_counter: '6',
            output: '12981615',
            previous_block:
              '3660eb4ef01bf9bdfb335567f0c716e71707b1509eacfd8c417d908c82f1ae91',
            size: 410,
            slot: 60_184_087,
            slot_leader:
              'pool1egfg26w0syqly9qc65hz33gqv2qrzyka8tfue3ccsk3c73a56jp',
            time: 1_715_867_287,
            tx_count: 1,
          },
          info: {
            asset_mint_or_burn_count: 0,
            block:
              '5b4653e515d592318976e22e718d6408948f85c1b2a56f26fe751f696c1c677d',
            block_height: 2_248_117,
            block_time: 1_715_867_287,
            delegation_count: 0,
            deposit: '0',
            fees: '173465',
            hash: '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
            index: 0,
            invalid_before: null,
            invalid_hereafter: '60191251',
            mir_cert_count: 0,
            output_amount: [
              {
                quantity: '12981615',
                unit: 'lovelace',
              },
            ],
            pool_retire_count: 0,
            pool_update_count: 0,
            redeemer_count: 0,
            size: 406,
            slot: 60_184_087,
            stake_cert_count: 0,
            utxo_count: 4,
            valid_contract: true,
            withdrawal_count: 0,
          },
          metadata: [],
          utxos: {
            hash: '3eafd8a177c0806c89835601fde8797d467ee199df83cbe07632781a5cc7d6d3',
            inputs: [
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '12000000',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '87c3e3e91ca613e1b0687704112d6de386c1635d596cbc9bd21326a3f9a00589',
              },
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '1155080',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '928cc1453d0f956fca3b4359aad057e8e3872befc8ec92988bdc9f91c1e40271',
              },
            ],
            outputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1155080',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference_script_hash: null,
              },
              {
                address:
                  'addr_test1qpp6zag0q4hdt7th0gy4k0tjlv3s5xewt5443um8gp29schy5a403uhhz384ru5ppln88zjqvg7kjxtz8upmkl8rpqgq40rhq4',
                amount: [
                  {
                    quantity: '11826535',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference_script_hash: null,
              },
            ],
          },
        },
        c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224: {
          block: {
            block_vrf:
              'vrf_vk1zqpmsxhsn39vk4fwp7an8llpys2nvreggtqwqg93rvyuhqhhchjq0gqduw',
            confirmations: 98_318,
            epoch: 145,
            epoch_slot: 313_636,
            fees: '1070472',
            hash: '932f3f1422722ff85b96d5d74ae9b567f09302c18c12dc8c6c051563b896bc82',
            height: 2_298_116,
            next_block:
              '5963f363e2dba7cf3a7cbd25219aaf449b9040e2d98f3ae16dac2ea99d6c1e44',
            op_cert:
              '4a75bb54a40c6f3267c88aa4dc791c15b8ddaae44765b9dfb397458895568dbd',
            op_cert_counter: '5',
            output: '20520857236',
            previous_block:
              'e6594b265b304a781337fcd0a87202105082724773d3ccd7e4d2fd028a79fc1c',
            size: 3584,
            slot: 61_312_036,
            slot_leader:
              'pool13m26ky08vz205232k20u8ft5nrg8u68klhn0xfsk9m4gsqsc44v',
            time: 1_716_995_236,
            tx_count: 3,
          },
          info: {
            asset_mint_or_burn_count: 0,
            block:
              '932f3f1422722ff85b96d5d74ae9b567f09302c18c12dc8c6c051563b896bc82',
            block_height: 2_298_116,
            block_time: 1_716_995_236,
            delegation_count: 0,
            deposit: '0',
            fees: '210161',
            hash: 'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
            index: 2,
            invalid_before: null,
            invalid_hereafter: '61319212',
            mir_cert_count: 0,
            output_amount: [
              {
                quantity: '19211824041',
                unit: 'lovelace',
              },
              {
                quantity: '2',
                unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
              },
              {
                quantity: '1',
                unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
              },
              {
                quantity: '1',
                unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
              },
              {
                quantity: '2',
                unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
              },
              {
                quantity: '2',
                unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
              },
              {
                quantity: '2',
                unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
              },
              {
                quantity: '8704538763',
                unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
              },
              {
                quantity: '67280096',
                unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
              },
              {
                quantity: '2',
                unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
              },
              {
                quantity: '2253633',
                unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
              },
            ],
            pool_retire_count: 0,
            pool_update_count: 0,
            redeemer_count: 0,
            size: 1240,
            slot: 61_312_036,
            stake_cert_count: 0,
            utxo_count: 4,
            valid_contract: true,
            withdrawal_count: 0,
          },
          metadata: [],
          utxos: {
            hash: 'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
            inputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
                amount: [
                  {
                    quantity: '1621219',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '35df1fdedc85bc84fab4d4aa112e6a3e6322d23c8ef1dd0401a5a6afeeb00f80',
              },
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '19210412983',
                    unit: 'lovelace',
                  },
                  {
                    quantity: '2',
                    unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
                  },
                  {
                    quantity: '1',
                    unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
                  },
                  {
                    quantity: '1',
                    unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
                  },
                  {
                    quantity: '2',
                    unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
                  },
                  {
                    quantity: '2',
                    unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
                  },
                  {
                    quantity: '2',
                    unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
                  },
                  {
                    quantity: '8704538763',
                    unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
                  },
                  {
                    quantity: '67280096',
                    unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
                  },
                  {
                    quantity: '2',
                    unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
                  },
                  {
                    quantity: '2253633',
                    unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '8bf11536a35d9a2fa6a5189a926c53a5c9484c016fdc0ccd2363a8a661898115',
              },
            ],
            outputs: [
              {
                address:
                  'addr_test1qr6a0lr6atpagle72hx6g5c5v27hxn4k27qcwzv26r7ednvzj3tw59zn62kup4fwx2zhl454anu8wtalrusr77s4q4gsat87h2',
                amount: [
                  {
                    quantity: '2000000000',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference_script_hash: null,
              },
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gnkqvts2ek6wpe8jcjvmdyl7jkuqzycmjzjscs7d2d3rha7szwq6my',
                amount: [
                  {
                    quantity: '17211824041',
                    unit: 'lovelace',
                  },
                  {
                    quantity: '2',
                    unit: '093e1dd222241dabb60ec25e98026d68ff45bd4e7c6a86bca0f59d3853505f714a61653270',
                  },
                  {
                    quantity: '1',
                    unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
                  },
                  {
                    quantity: '1',
                    unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
                  },
                  {
                    quantity: '2',
                    unit: '666816b289a3c7a6427333703dc6cfd4b9c544f97bd70dfd913a778a53505f4d464b497961',
                  },
                  {
                    quantity: '2',
                    unit: '6736988a80b3e42c1940e48d5ab2de52c626acb22d21c13b5ff5c86253505f47516674726f',
                  },
                  {
                    quantity: '2',
                    unit: 'b2ab960cf45de24f65d7abe9ee6ac7ed03453a8953fe2421eba0d32553505f676471663775',
                  },
                  {
                    quantity: '8704538763',
                    unit: 'c82a4452eaebccb82aced501b3c94d3662cf6cd2915ad7148b459aec41584f',
                  },
                  {
                    quantity: '67280096',
                    unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
                  },
                  {
                    quantity: '2',
                    unit: 'fa39bd793aed73c0a2d30451e616e298320cb8ada00987370d2dcd0453505f464556484e4a',
                  },
                  {
                    quantity: '2253633',
                    unit: 'fbaec8dd4d4405a4a42aec11ce5a0160c01e488f3918b082ccbab70544da9f788bef996b9adbefa7d3d9cbb616d7e8174a1ffaf320270db7bf561b05',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference_script_hash: null,
              },
            ],
          },
        },
        '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21': {
          block: {
            block_vrf:
              'vrf_vk18xtl3n0yawku3xflkrnnez98qk8vpzdxxywvr7fs8z9ez98u8jvs99znjq',
            confirmations: 169_687,
            epoch: 141,
            epoch_slot: 405_690,
            fees: '1167560',
            hash: '78cb8b75d0fe9ead9fae1d588f3f8d306f5d1d55579b98c0a7c8af6434ad25b4',
            height: 2_226_747,
            next_block:
              '7dfa05e5405562d41e81774cdbfec1ef99428710b64d2442eec0efcf6315052d',
            op_cert:
              '75d4f6f7a12cd70d6aafdaa272ca27b5606c9a16a560e696cc7f1aa551491a9d',
            op_cert_counter: '6',
            output: '48773920',
            previous_block:
              'f9541f5b0d316cb8d3f8c3cbf3888f3cd6a73369f2fedc61fa7398d02e14d427',
            size: 11_760,
            slot: 59_676_090,
            slot_leader:
              'pool13la5erny3srx9u4fz9tujtl2490350f89r4w4qjhk0vdjmuv78v',
            time: 1_715_359_290,
            tx_count: 3,
          },
          info: {
            asset_mint_or_burn_count: 0,
            block:
              '78cb8b75d0fe9ead9fae1d588f3f8d306f5d1d55579b98c0a7c8af6434ad25b4',
            block_height: 2_226_747,
            block_time: 1_715_359_290,
            delegation_count: 0,
            deposit: '0',
            fees: '177557',
            hash: '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
            index: 2,
            invalid_before: null,
            invalid_hereafter: '59683243',
            mir_cert_count: 0,
            output_amount: [
              {
                quantity: '3199212',
                unit: 'lovelace',
              },
              {
                quantity: '10000',
                unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
              },
              {
                quantity: '1',
                unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
              },
              {
                quantity: '2',
                unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
              },
            ],
            pool_retire_count: 0,
            pool_update_count: 0,
            redeemer_count: 0,
            size: 499,
            slot: 59_676_090,
            stake_cert_count: 0,
            utxo_count: 4,
            valid_contract: true,
            withdrawal_count: 0,
          },
          metadata: [],
          utxos: {
            hash: '49acbc6d2d30e7ba7a829d93ce0d32f26d8046765d6a1b50c8380b1595fb5c21',
            inputs: [
              {
                address:
                  'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
                amount: [
                  {
                    quantity: '2407019',
                    unit: 'lovelace',
                  },
                  {
                    quantity: '10000',
                    unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
                  },
                  {
                    quantity: '1',
                    unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
                  },
                  {
                    quantity: '2',
                    unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '1114419daf15ba0be827ae88e29bf0ae8101a66913e510f5716ca9117bc17f6e',
              },
              {
                address:
                  'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
                amount: [
                  {
                    quantity: '969750',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference: false,
                reference_script_hash: null,
                tx_hash:
                  '2b98c1e09195aa75fda3cd3ada85fdc33947e9eab1f4532efe7e080604a9da7d',
              },
            ],
            outputs: [
              {
                address:
                  'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
                amount: [
                  {
                    quantity: '1640000',
                    unit: 'lovelace',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 0,
                reference_script_hash: null,
              },
              {
                address:
                  'addr_test1qzp4yryr67cvx2q0ulzrzr8yxmvtl0vcmx6l2edtwppv4wc88gdwkrravwyeznhncgq6c3tzxu3ql4khjsenqu2juuqqxc6c3w',
                amount: [
                  {
                    quantity: '1559212',
                    unit: 'lovelace',
                  },
                  {
                    quantity: '10000',
                    unit: '25561d09e55d60b64525b9cdb3cfbec23c94c0634320fec2eaddde584c616365436f696e33',
                  },
                  {
                    quantity: '1',
                    unit: '5c677ba4dd295d9286e0e22786fea9ed735a6ae9c07e7a45ae4d95c84372696d696e616c50756e6b73204c6f6f74',
                  },
                  {
                    quantity: '2',
                    unit: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
                  },
                ],
                collateral: false,
                data_hash: null,
                inline_datum: null,
                output_index: 1,
                reference_script_hash: null,
              },
            ],
          },
        },
      },
    },
    lastUpdate:
      'c79f37caa73e2db87367c8ca9a802d4c50032f21c7057757659f39ba3b68a224',
    lovelace: '17214004981',
    minAda: '4913400',
    paymentAddr:
      'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
    rewardAddr:
      'stake_test1uzzc7n4y0g4ajehlaxvm7grfc5n88rt3cgydkfhfl77aq6ss5kauz',
  },
  publicKey:
    'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc',
  stakeKeyHash: '858f4ea47a2bd966ffe999bf2069c526738d71c208db26e9ffbdd06a',
  paymentAddr:
    'addr_test1qqmlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qdgdrwh',
  lovelace: '12737296152',
  minAda: '3521270',
};
