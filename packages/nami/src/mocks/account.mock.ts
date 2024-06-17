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
  lovelace: null,
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
