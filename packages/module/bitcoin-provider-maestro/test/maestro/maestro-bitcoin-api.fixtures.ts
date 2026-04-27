// This test vectors were taken from maestro API for testnet4
import type { MaestroTransactionResponse } from '../../src/maestro';

export const COINBASE_OP_RETURN_TX = {
  data: {
    data: {
      input_addresses: null,
      output_addresses: ['tb1q548z58kqvwyjqwy8vc2ntmg33d7s2wyfv7ukq4'],
      txid: 'b54956e439ac2607f0b0f9ff4354b3480fab45c8c12d361d098681a197fbd928',
      hash: '76d6f30a9b28c967290d9ff1f510b4c6f915a26a7cce497f34160a22a215d666',
      version: 1,
      size: 207,
      vsize: 180,
      weight: 720,
      locktime: 0,
      vin: [
        {
          script_type: '',
          address: '',
          value: 0,
          coinbase:
            '03e564010004606d776804d315960a0c04f77468cf020000000000000a636b706f6f6c062f4077697a2f',
          txid: '',
          vout: 0,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '0000000000000000000000000000000000000000000000000000000000000000',
          ],
          sequence: 0xffffffff,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q548z58kqvwyjqwy8vc2ntmg33d7s2wyfv7ukq4',
          value: 50.01742415,
          n: 0,
          scriptPubKey: {
            asm: '0 a54e2a1ec06389203887661535ed118b7d053889',
            desc: 'addr(tb1q548z58kqvwyjqwy8vc2ntmg33d7s2wyfv7ukq4)#fysgjy6t',
            hex: '0014a54e2a1ec06389203887661535ed118b7d053889',
            address: 'tb1q548z58kqvwyjqwy8vc2ntmg33d7s2wyfv7ukq4',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: '',
          address: '',
          value: 0,
          n: 1,
          scriptPubKey: {
            asm: 'OP_RETURN aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a',
            desc: 'raw(6a24aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a)#p8ua3v3t',
            hex: '6a24aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a',
            address: '',
            type: 'nulldata',
          },
        },
      ],
      hex: '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff2a03e564010004606d776804d315960a0c04f77468cf020000000000000a636b706f6f6c062f4077697a2fffffffff024f88202a01000000160014a54e2a1ec06389203887661535ed118b7d0538890000000000000000266a24aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a0120000000000000000000000000000000000000000000000000000000000000000000000000',
      blockhash:
        '0000000000000003c3c07c4b8aabf81d77b8aa7d4f5071b6e3bb04c095fd5425',
      blockheight: 91_365,
      blocktime: 1_752_657_796,
      confirmations: 45,
      time: 1_752_657_796,
      total_input_volume: 0,
      total_output_volume: 50.01742415,
      total_fees: 0,
    },
    last_updated: {
      block_hash:
        '0000000000000003c3c07c4b8aabf81d77b8aa7d4f5071b6e3bb04c095fd5425',
      block_height: 91_365,
    },
  },
  status: 200,
};

export const REGULAR_TX = {
  data: {
    data: {
      input_addresses: ['tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d'],
      output_addresses: [
        'tb1q9p6x5sr0djj77lde5u22xvv55pv024f4sz8pqj',
        'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
      ],
      txid: 'd34d329997dc02a0ce85496409c5c8f84d9a584d1d0db37fcef8e63005b3da20',
      hash: '280b987898d5b71382cee94bd767d01aa35b9157e33a1afd5441e2b5ce2ca124',
      version: 2,
      size: 223,
      vsize: 141,
      weight: 562,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
          value: 0.00632,
          coinbase: '',
          txid: '7f956f208d0e2d30d104facc0da518bda201d57ce6cc1b0e43213a3235b3b487',
          vout: 1,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [],
          sequence: 0xffffffff,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q9p6x5sr0djj77lde5u22xvv55pv024f4sz8pqj',
          value: 0.00031,
          n: 0,
          scriptPubKey: {
            asm: '0 28746a406f6ca5ef7db9a714a33194a058f555352',
            desc: 'addr(tb1q9p6x5sr0djj77lde5u22xvv55pv024f4sz8pqj)#c2v4v3g7',
            hex: '001428746a406f6ca5ef7db9a714a33194a058f5553',
            address: 'tb1q9p6x5sr0djj77lde5u22xvv55pv024f4sz8pqj',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
          value: 0.00564,
          n: 1,
          scriptPubKey: {
            asm: '0 a82c39b82403b73c591220b602882a8150c00908',
            desc: 'addr(tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d)#d8j6v5x5',
            hex: '0014a82c39b82403b73c591220b602882a8150c00908',
            address: 'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
            type: 'witness_v0_keyhash',
          },
        },
      ],
      hex: '0200000000010187b4b335323a21430e1bcce67cd501a2bd18a50dccfa04d1302d0e8d206f957f0100000000ffffffff02187900000000000016001428746a406f6ca5ef7db9a714a33194a058f55535209b080000000000160014a82c39b82403b73c591220b602882a8150c0090802483045022100b733e2f89b63aaf90170694f09cf82ab1785b5c01cc6bc31bb60ba0e92ebd41c02201f4e677b5aeb6db6e95d9ff0a08218c317bf5d0c56cadb54f76c73aaae32e32e012103f32f694076db9b153afa3c489c76c50432fe6015939f4d6e89d7ae90b10d95cf00000000',
      blockhash:
        '0000000000000003c3c07c4b8aabf81d77b8aa7d4f5071b6e3bb04c095fd5425',
      blockheight: 91_365,
      blocktime: 1_752_657_796,
      confirmations: 53,
      time: 1_752_657_796,
      total_input_volume: 0.00632,
      total_output_volume: 0.00595,
      total_fees: 0.00037,
    },
    last_updated: {
      block_hash:
        '0000000000000003c3c07c4b8aabf81d77b8aa7d4f5071b6e3bb04c095fd5425',
      block_height: 91_365,
    },
  } as MaestroTransactionResponse,
  status: 200,
};

export const LAST_KNOWN_BLOCK_RESPONSE = {
  data: {
    data: {
      chain: 'testnet4',
      blocks: 91417,
      headers: 91417,
      bestblockhash:
        '0000000093e5007f7707265e758cfcd300e9937486401c40efa4f2c830124927',
      difficulty: 1,
      mediantime: 1752691426,
      verificationprogress: 1,
      initialblockdownload: false,
      chainwork:
        '000000000000000000000000000000000000000000000354f6d8a496e9007c74',
      size_on_disk: 17870066943,
      pruned: false,
      softforks: null,
      warnings: '',
    },
    last_updated: {
      block_height: 91417,
      block_hash:
        '0000000093e5007f7707265e758cfcd300e9937486401c40efa4f2c830124927',
    },
  },
  status: 200,
};

export const ADDRESS_TXS_PAGE = {
  data: {
    data: [
      {
        tx_hash:
          'b59c441717990c84eeebde12ac2a2434ca93c4cd0ab65908f6118e09e0ffaabc',
        height: 90187,
        input: true,
        output: true,
      },
      {
        tx_hash:
          'd86865b8fb07781d85e46d17a8d41701aafe9d1ef186350816c3a77761012fdf',
        height: 90176,
        input: true,
        output: true,
      },
      {
        tx_hash:
          'f9d1458a07f6a8b2353edfaead687304099ace1d1a668e0a918504bb41abc39e',
        height: 90173,
        input: true,
        output: true,
      },
    ],
    last_updated: {
      block_hash:
        '000000000097dfbe16509a8f6b2ef6cdc3edc03af0c2e2483752fcab4e99f865',
      block_height: 91_421,
    },
    next_cursor: 'AwE8bgEBqmsIjCdouqc2tlAsam8jikVZZRlFb9dqt5nq52GypWQ',
  },
  status: 200,
};

export const TX_B59C44 = {
  data: {
    data: {
      input_addresses: ['tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf'],
      output_addresses: [
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
      ],
      txid: 'b59c441717990c84eeebde12ac2a2434ca93c4cd0ab65908f6118e09e0ffaabc',
      hash: '836d70bded02c0a843ed706d173c2b2370a4b17033758795d4a5f5e3d9979352',
      version: 2,
      size: 240,
      vsize: 158,
      weight: 630,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00459781,
          coinbase: '',
          txid: '9bd68eb4760d34769288def5eeb452942abdcd211bfecfde395f3adea02eea5e',
          vout: 1,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '30450221008abd5f29ce4c5a196d7ab6f0be87e6a43e19ab70fb7d73b5c20348bb9b09701d022077fca8fe55079859b4ebf1f188595e4b97d8b796988523df1fc2ff3b0d06b93501',
            '029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f9',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.0001,
          n: 0,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00449592,
          n: 1,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: '',
          address: '',
          value: 0,
          n: 2,
          scriptPubKey: {
            asm: 'OP_RETURN e4bda0e5a5bd',
            desc: 'raw(6a06e4bda0e5a5bd)#cxvlygyn',
            hex: '6a06e4bda0e5a5bd',
            address: '',
            type: 'nulldata',
          },
        },
      ],
      hex: '020000000001015eea2ea0de3a5f39decffe1b21cdbd2a9452b4eef5de889276340d76b48ed69b0100000000ffffffff03102700000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c52838dc06000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c5280000000000000000086a06e4bda0e5a5bd024830450221008abd5f29ce4c5a196d7ab6f0be87e6a43e19ab70fb7d73b5c20348bb9b09701d022077fca8fe55079859b4ebf1f188595e4b97d8b796988523df1fc2ff3b0d06b9350121029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f900000000',
      blockhash:
        '000000000000000352346560e857cd25eae743bb20c0a4cf22d16285a1ff25a4',
      blockheight: 90187,
      blocktime: 1752011869,
      confirmations: 1235,
      time: 1752011869,
      total_input_volume: 0.00459781,
      total_output_volume: 0.00459592,
      total_fees: 0.0000018900000000000514,
    },
    last_updated: {
      block_height: 91421,
      block_hash:
        '000000000097dfbe16509a8f6b2ef6cdc3edc03af0c2e2483752fcab4e99f865',
    },
  },
  status: 200,
};

export const TX_D86865 = {
  data: {
    data: {
      input_addresses: ['tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf'],
      output_addresses: [
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
      ],
      txid: 'd86865b8fb07781d85e46d17a8d41701aafe9d1ef186350816c3a77761012fdf',
      hash: 'd3dd9cb0d80a17a51f299ff6ac19b6496ad39cede1c1a2e5834b2620efad74bd',
      version: 2,
      size: 243,
      vsize: 161,
      weight: 642,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.005,
          coinbase: '',
          txid: '369f9c59c2467ade8bab0e90c22a7b993b8a22fba66f24371a3e651d876175c1',
          vout: 0,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '3045022100f147bdbf7b7be0383936645b07827623342e395674512b07db09f9a289e935c702201f49acd553cc67be8c7e88312a821fe8c66e12f50140f69c3e2af7f5510bf1ac01',
            '029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f9',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.0001,
          n: 0,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00489811,
          n: 1,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: '',
          address: '',
          value: 0,
          n: 2,
          scriptPubKey: {
            asm: 'OP_RETURN 54657374204e6f7465',
            desc: 'raw(6a0954657374204e6f7465)#3lmvw0zr',
            hex: '6a0954657374204e6f7465',
            address: '',
            type: 'nulldata',
          },
        },
      ],
      hex: '02000000000101c17561871d653e1a37246fa6fb228a3b997b2ac2900eab8bde7a46c2599c9f360000000000ffffffff03102700000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c528537907000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c52800000000000000000b6a0954657374204e6f746502483045022100f147bdbf7b7be0383936645b07827623342e395674512b07db09f9a289e935c702201f49acd553cc67be8c7e88312a821fe8c66e12f50140f69c3e2af7f5510bf1ac0121029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f900000000',
      blockhash:
        '000000000000000264236ee369934eae47c616996dc7cc4dd84fcc3bac309d75',
      blockheight: 90176,
      blocktime: 1752002904,
      confirmations: 1246,
      time: 1752002904,
      total_input_volume: 0.005,
      total_output_volume: 0.00499811,
      total_fees: 0.0000018900000000000514,
    },
    last_updated: {
      block_height: 91421,
      block_hash:
        '000000000097dfbe16509a8f6b2ef6cdc3edc03af0c2e2483752fcab4e99f865',
    },
  },
  status: 200,
};

export const TX_F9D145 = {
  data: {
    data: {
      input_addresses: ['tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf'],
      output_addresses: [
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
      ],
      txid: 'f9d1458a07f6a8b2353edfaead687304099ace1d1a668e0a918504bb41abc39e',
      hash: '838c8cc4ae53b9672ecba7deac632cd6b5c8469a6c06b54e6d71aebfff09497f',
      version: 2,
      size: 242,
      vsize: 161,
      weight: 641,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00159562,
          coinbase: '',
          txid: '9d70d4785aed31b1bea87b5dc4c53fee310c9bf11ccd7178747656ec7c3511e7',
          vout: 1,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '3044022001844d010ad045d253c2a7d1d051ae520f8452ef8a879b3cc8d13e323ea98afa022002ddbc79ead68823c0836df4b719d4bc69728078b7e5d625a9d6be5d25bfadf301',
            '029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f9',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.0001,
          n: 0,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00149207,
          n: 1,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: '',
          address: '',
          value: 0,
          n: 2,
          scriptPubKey: {
            asm: 'OP_RETURN 54657374204e6f7465',
            desc: 'raw(6a0954657374204e6f7465)#3lmvw0zr',
            hex: '6a0954657374204e6f7465',
            address: '',
            type: 'nulldata',
          },
        },
      ],
      hex: '02000000000101e711357cec5676747871cd1cf19b0c31ee3fc5c45d7ba8beb131ed5a78d4709d0100000000ffffffff03102700000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c528d74602000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c52800000000000000000b6a0954657374204e6f746502473044022001844d010ad045d253c2a7d1d051ae520f8452ef8a879b3cc8d13e323ea98afa022002ddbc79ead68823c0836df4b719d4bc69728078b7e5d625a9d6be5d25bfadf30121029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f900000000',
      blockhash:
        '00000000000000018fa8d6d58bbba76b9c9092e80a3b8f2a559f12efbbf5b636',
      blockheight: 90173,
      blocktime: 1752005730,
      confirmations: 1249,
      time: 1752005730,
      total_input_volume: 0.00159562,
      total_output_volume: 0.0015920700000000001,
      total_fees: 0.0000035499999999999508,
    },
    last_updated: {
      block_height: 91421,
      block_hash:
        '000000000097dfbe16509a8f6b2ef6cdc3edc03af0c2e2483752fcab4e99f865',
    },
  },
  status: 200,
};

export const ADDRESS_MEMPOOL_TXS_PAGE = {
  data: {
    data: [
      {
        txid: '58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e',
        vout: 0,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '20000',
        height: 79782,
        mempool: true,
        runes: [],
        inscriptions: [],
      },
      {
        txid: '58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e',
        vout: 1,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '2400',
        height: 80241,
        mempool: true,
        runes: [],
        inscriptions: [],
      },
      {
        txid: 'e1502f80b9d0bd97969bb7b8a60a41b3115a5b584c50a0ea0ef378c528b00a46',
        vout: 1,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '97523',
        height: 80529,
        mempool: true,
        runes: [],
        inscriptions: [],
      },
      {
        txid: 'b4ea3ad122c3a5fce9d11c44abbbfab560a4e52e36298335ba0e67aa63ab5123',
        vout: 1,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '55062',
        height: 80539,
        mempool: false,
        runes: [],
        inscriptions: [],
      },
    ],
    indexer_info: {
      chain_tip: {
        block_hash:
          '000000006ce5f490d9b1cf13ac197e769a67e77b71a252bf3c9df6c9455b331a',
        block_height: 91437,
      },
      mempool_timestamp: '2025-07-16 21:22:16',
      estimated_blocks: [
        {
          block_height: 91438,
          sats_per_vb: {
            min: 1,
            median: 3,
            max: 101,
          },
        },
      ],
    },
    next_cursor: null,
  },
  status: 200,
};

export const TX_58b595 = {
  data: {
    data: {
      input_addresses: ['tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf'],
      output_addresses: [
        'tb1qgjja2kwzpjgeqmqrxk5kygg2x0c7zax5zs6hhy',
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
      ],
      txid: '58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e',
      hash: '146fdf35286fdf3e70bfd27603dc065e57694f604bf468d74966229b5059f8b5',
      version: 2,
      size: 222,
      vsize: 141,
      weight: 561,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.001,
          coinbase: '',
          txid: 'dfdf4032d6e792f5d3bd5260565489a33e9c50f3532d818cf82a308b76d86583',
          vout: 0,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '30440220169056738e4eeaf6dc927a655f10725f8d3815a5f6de5a1a6804feef5c17132302203ddcdac340b533d6fd6f7c24a0d6cc56ed630364b20ecaf87c9e60e689970be101',
            '029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f9',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qgjja2kwzpjgeqmqrxk5kygg2x0c7zax5zs6hhy',
          value: 0.0000233,
          n: 0,
          scriptPubKey: {
            asm: '0 44a5d559c20c91906c0335a962210a33f1e174d4',
            desc: 'addr(tb1qgjja2kwzpjgeqmqrxk5kygg2x0c7zax5zs6hhy)#hmy7tnwn',
            hex: '001444a5d559c20c91906c0335a962210a33f1e174d4',
            address: 'tb1qgjja2kwzpjgeqmqrxk5kygg2x0c7zax5zs6hhy',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.00097523,
          n: 1,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
      ],
      hex: '020000000001018365d8768b302af88c812d53f3509c3ea38954566052bdd3f592e7d63240dfdf0000000000ffffffff021a0900000000000016001444a5d559c20c91906c0335a962210a33f1e174d4f37c01000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c528024730440220169056738e4eeaf6dc927a655f10725f8d3815a5f6de5a1a6804feef5c17132302203ddcdac340b533d6fd6f7c24a0d6cc56ed630364b20ecaf87c9e60e689970be10121029bb34ca00cb77ec4ee55d08096ef3e615915841c1f2add83f4444ecea848c9f900000000',
      blockhash:
        '0000000051fb6bda1633481b358db170e925a2c525443a26eebdaa354bf5ad28',
      blockheight: 80529,
      blocktime: 1746186208,
      confirmations: 10909,
      time: 1746186208,
      total_input_volume: 0.001,
      total_output_volume: 0.00099853,
      total_fees: 0.0000014699999999999436,
    },
    last_updated: {
      block_height: 91437,
      block_hash:
        '000000006ce5f490d9b1cf13ac197e769a67e77b71a252bf3c9df6c9455b331a',
    },
  },
  status: 200,
};

export const TX_E1502F = {
  data: {
    data: {
      input_addresses: ['tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92'],
      output_addresses: [
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        'tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92',
      ],
      txid: 'e1502f80b9d0bd97969bb7b8a60a41b3115a5b584c50a0ea0ef378c528b00a46',
      hash: 'a34873f37cac9642e22ae147143212dc9cd106f4797ef6630576eb85401c0b33',
      version: 2,
      size: 223,
      vsize: 141,
      weight: 562,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92',
          value: 0.00123557,
          coinbase: '',
          txid: '439b99ea0ddd0cfa1a3ac204349345427cb0d5e8c22de21bbd6a0c09c7d9f71a',
          vout: 1,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '3045022100aca81a317f7308c6a7eca92c00eb05f7b16becd5e252e7180efedaa15336c983022002b7f03ab3732e9be873397ab4957c8da815a77809f44305ce1fcd3cb8d3a50a01',
            '03c984bae33d4606f4aaa2328467bd539f71818c65ad5567c49265721ccdc1a18d',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.000023,
          n: 0,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92',
          value: 0.0012111,
          n: 1,
          scriptPubKey: {
            asm: '0 f833dda7e69d5321e837f84ae9c2b077bef797a8',
            desc: 'addr(tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92)#n2049l88',
            hex: '0014f833dda7e69d5321e837f84ae9c2b077bef797a8',
            address: 'tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92',
            type: 'witness_v0_keyhash',
          },
        },
      ],
      hex: '020000000001011af7d9c7090c6abd1be22dc2e8d5b07c4245933404c23a1afa0cdd0dea999b430100000000ffffffff02fc0800000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c52816d9010000000000160014f833dda7e69d5321e837f84ae9c2b077bef797a802483045022100aca81a317f7308c6a7eca92c00eb05f7b16becd5e252e7180efedaa15336c983022002b7f03ab3732e9be873397ab4957c8da815a77809f44305ce1fcd3cb8d3a50a012103c984bae33d4606f4aaa2328467bd539f71818c65ad5567c49265721ccdc1a18d00000000',
      blockhash:
        '00000000000000000812612427293fb684a0d4d78eb55363c83c0b750ba284c0',
      blockheight: 80241,
      blocktime: 1746019121,
      confirmations: 11197,
      time: 1746019121,
      total_input_volume: 0.00123557,
      total_output_volume: 0.0012341,
      total_fees: 0.0000014700000000001604,
    },
    last_updated: {
      block_height: 91437,
      block_hash:
        '000000006ce5f490d9b1cf13ac197e769a67e77b71a252bf3c9df6c9455b331a',
    },
  },
  status: 200,
};

export const TX_B4EA3A = {
  data: {
    data: {
      input_addresses: ['tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d'],
      output_addresses: [
        'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        'tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d',
      ],
      txid: 'b4ea3ad122c3a5fce9d11c44abbbfab560a4e52e36298335ba0e67aa63ab5123',
      hash: 'f2c9bb16755fb9a4c417e72336a7e96176eb3e842b8567ec15d138fe4362e93b',
      version: 2,
      size: 222,
      vsize: 141,
      weight: 561,
      locktime: 0,
      vin: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d',
          value: 0.00305695,
          coinbase: '',
          txid: 'b76d8b352cd90d3584451e409212325ceb969ebfb4962d42a21b7faeecae3413',
          vout: 1,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [
            '304402206aabf4c1d9c98eac959d26fb4f4dd207f623f95d5690a340957153265fe8c21f02203560c8e5c6817b5c5eaa71949f15e2054b75428be80ee9fa778306ee0fc9bec901',
            '025309cfcdf87b81e168d1d8b46ca96d0e3c91bc01b6e363d910fb65aafc93eb1b',
          ],
          sequence: 4294967295,
        },
      ],
      vout: [
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
          value: 0.0002,
          n: 0,
          scriptPubKey: {
            asm: '0 74b5ad435cb2fea053bb7f3327bcfc826082c528',
            desc: 'addr(tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf)#fdyt8zw4',
            hex: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
            address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
            type: 'witness_v0_keyhash',
          },
        },
        {
          script_type: 'witness_v0_keyhash',
          address: 'tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d',
          value: 0.0028533,
          n: 1,
          scriptPubKey: {
            asm: '0 f678e6cfed46a83fdc94d3de1f655d44ce93147a',
            desc: 'addr(tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d)#scc6kzwg',
            hex: '0014f678e6cfed46a83fdc94d3de1f655d44ce93147a',
            address: 'tb1q7euwdnldg65rlhy5600p7e2agn8fx9r6j0zv6d',
            type: 'witness_v0_keyhash',
          },
        },
      ],
      hex: '020000000001011334aeecae7f1ba2422d96b4bf9e96eb5c321292401e4584350dd92c358b6db70100000000ffffffff02204e00000000000016001474b5ad435cb2fea053bb7f3327bcfc826082c528925a040000000000160014f678e6cfed46a83fdc94d3de1f655d44ce93147a0247304402206aabf4c1d9c98eac959d26fb4f4dd207f623f95d5690a340957153265fe8c21f02203560c8e5c6817b5c5eaa71949f15e2054b75428be80ee9fa778306ee0fc9bec90121025309cfcdf87b81e168d1d8b46ca96d0e3c91bc01b6e363d910fb65aafc93eb1b00000000',
      blockhash:
        '000000000000000504e3056d5711eaa345029a5029b7a2c1603dbfed8e5bdeea',
      blockheight: 79782,
      blocktime: 1745841615,
      confirmations: 11656,
      time: 1745841615,
      total_input_volume: 0.00305695,
      total_output_volume: 0.0030533,
      total_fees: 0.0000036500000000000074,
    },
    last_updated: {
      block_height: 91437,
      block_hash:
        '000000006ce5f490d9b1cf13ac197e769a67e77b71a252bf3c9df6c9455b331a',
    },
  },
  status: 200,
};

export const UTXOS_RESPONSE = {
  data: {
    data: [
      {
        txid: '58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e',
        vout: 0,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '20000',
        confirmations: 11706,
        height: 79782,
        runes: [],
        inscriptions: [],
      },
      {
        txid: '4f650da7349fcbf176f3806f692010c6d50c27595e04c3306abd908efecd1db6',
        vout: 0,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '2300',
        confirmations: 11247,
        height: 80241,
        runes: [],
        inscriptions: [],
      },
      {
        txid: 'e1502f80b9d0bd97969bb7b8a60a41b3115a5b584c50a0ea0ef378c528b00a46',
        vout: 1,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '97523',
        confirmations: 10959,
        height: 80529,
        runes: [],
        inscriptions: [],
      },
      {
        txid: 'b4ea3ad122c3a5fce9d11c44abbbfab560a4e52e36298335ba0e67aa63ab5123',
        vout: 1,
        address: 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf',
        script_pubkey: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
        satoshis: '55062',
        confirmations: 10949,
        height: 80539,
        runes: [],
        inscriptions: [],
      },
    ],
    last_updated: {
      block_hash:
        '00000000019733b69e491520c8dd82bb687451bd1c15b49336bb194041317521',
      block_height: 91487,
    },
    next_cursor: null,
  },
  status: 200,
};

export const UTXOS_WITH_INSCRIPTION_RESPONSE = {
  data: {
    data: [
      {
        txid: '0d6f0c08adcc07fe6e09aaf952455e7d9ca2fc94f71975efd3946533e7225fcb',
        vout: 0,
        address:
          'tb1psaf4er4pj6r5u54ptq7d55d0mydax3cyt2mrttvyzqqktpyvye5q9cvd9g',
        script_pubkey:
          '512087535c8ea196874e52a1583cda51afd91bd347045ab635ad84100165848c2668',
        satoshis: '546',
        confirmations: 1039,
        height: 90446,
        runes: [],
        inscriptions: [
          {
            offset: 0,
            inscription_id:
              '0d6f0c08adcc07fe6e09aaf952455e7d9ca2fc94f71975efd3946533e7225fcbi0',
          },
        ],
      },
    ],
    last_updated: {
      block_hash:
        '000000000ea5b2dc3b59a84cba189cde162a200c76748461b8ffd676eed1890a',
      block_height: 91484,
    },
    next_cursor: null,
  },
  status: 200,
};
export const UTXOS_WITH_RUNES_RESPONSE = {
  data: {
    data: [
      {
        txid: '63937d48e35d15a7c5530469210c202104cc94a945cc848554f336b3f4f24121',
        vout: 1,
        address:
          'tb1pn9dzakm6egrv90c9gsgs63axvmn6ydwemrpuwljnmz9qdk38ueqsqae936',
        script_pubkey:
          '5120995a2edb7aca06c2bf0544110d47a666e7a235d9d8c3c77e53d88a06da27e641',
        satoshis: '10000',
        confirmations: 60924,
        height: 30562,
        runes: [{ rune_id: '30562:50', amount: '1.00000000' }],
        inscriptions: [],
      },
    ],
    last_updated: {
      block_hash:
        '000000000134879adc7fd941833cc4af4767cac5256adee6b52bed6c828c4e61',
      block_height: 91485,
    },
    next_cursor: null,
  },
  status: 200,
};

export const FEE_ESTIMATION_RESPONSE = {
  data: {
    data: { feerate: 0.00022, blocks: 3 },
    last_updated: {
      block_height: 91668,
      block_hash:
        '00000000a331ac84e9bc3eda19b52564285ec9d20a50e1a86aa1b5e447a4b8fd',
    },
  },
  status: 200,
};
export const FEE_ESTIMATION_INVALID_RESPONSE = {
  data: {
    data: { feerate: 0.00022, blocks: 3 },
    last_updated: {
      block_height: 91668,
      block_hash:
        '00000000a331ac84e9bc3eda19b52564285ec9d20a50e1a86aa1b5e447a4b8fd',
    },
  },
  status: 201,
};

export const TX_SUBMIT_SUCCESS = {
  data: '81706c94558b5e09619b3b1204de069e3aaa90f01dd01a7c7345647310012a8e',
  status: 201,
};
