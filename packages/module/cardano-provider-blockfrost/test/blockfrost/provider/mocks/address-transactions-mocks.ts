import type { Responses } from '@blockfrost/blockfrost-js';

// Mock Blockfrost data for 3 different addresses with overlapping transaction timestamps
// https://docs.blockfrost.io/#tag/cardano--addresses/GET/addresses/{address}/transactions?order=desc
// This allows testing that getAccountTransactionHistory properly returns
// the latest 10 transactions across all addresses
export const mockBlockfrostAddressTransactions: Record<
  string,
  Responses['address_transactions_content']
> = {
  addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d:
    [
      {
        tx_hash:
          'dcf1ef3ec07e4754c81653a33548ba8ef8fc062a485b80fc454995091d5316a8',
        tx_index: 0,
        block_height: 3574446,
        block_time: 1749784650,
      },
      {
        tx_hash:
          '3477c72b0fd0f78281f22c3bb88642ad57c7c45c89c85117d4753ec66b58933b',
        tx_index: 1,
        block_height: 3572639,
        block_time: 1749735105,
      },
      {
        tx_hash:
          'd51f11637bd27bea168d1cc9caefdb1e5cd78a84c4ec5d65d44b91c50769fd5c',
        tx_index: 0,
        block_height: 3572622,
        block_time: 1749734513,
      },
      {
        tx_hash:
          '6a5801e04542301a67396cfa1d11562af61380944d0cfbd31536d2a96425b686',
        tx_index: 6,
        block_height: 3569010,
        block_time: 1749639696,
      },
      {
        tx_hash:
          'dbb90b36f0cf25a215f215a5affc30f7b4b72031ea112101bb54e53ebcd08ea7',
        tx_index: 6,
        block_height: 3568945,
        block_time: 1749637828,
      },
      {
        tx_hash:
          '661d57fb1cfc8d58864b787029054635e7254d147f894144f5fc0c5dde2dc0db',
        tx_index: 0,
        block_height: 3567618,
        block_time: 1749602744,
      },
    ],
  addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl:
    [
      {
        tx_hash:
          'df4c7f04249deb697aa5d3a41901f793ca8893b8c9a59f6c1a7a8c72d4e2afda',
        tx_index: 0,
        block_height: 3574116,
        block_time: 1749775612,
      },
      {
        tx_hash:
          'cf4d91fc4fa7bd54b7390ee52f8f79b8544e30905bc52fa39e0a0fa1afcca638',
        tx_index: 3,
        block_height: 3572626,
        block_time: 1749734712,
      },
      {
        tx_hash:
          '03780eb43e1d09b6e447e440d86f26e3176de825b7c3215c7bab0be9898d9448',
        tx_index: 0,
        block_height: 3569029,
        block_time: 1749640160,
      },
      {
        tx_hash:
          'bda2a18081ce1b54bcf8fed46b4c631dd64cfbdd88d16427a4f1e9b3392b1ea5',
        tx_index: 0,
        block_height: 3569002,
        block_time: 1749639434,
      },
      {
        tx_hash:
          'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        tx_index: 0,
        block_height: 3567620,
        block_time: 1749602800,
      },
    ],
  addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu:
    [
      {
        tx_hash:
          'f1e2d3c4b5a6978869504132abcdef0123456789abcdef0123456789abcdef01',
        tx_index: 2,
        block_height: 3572630,
        block_time: 1749734900,
      },
      {
        tx_hash:
          'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        tx_index: 1,
        block_height: 3569015,
        block_time: 1749639800,
      },
      {
        tx_hash:
          '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
        tx_index: 5,
        block_height: 3568000,
        block_time: 1749620000,
      },
      {
        tx_hash:
          '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        tx_index: 3,
        block_height: 3567000,
        block_time: 1749600000,
      },
    ],
};
