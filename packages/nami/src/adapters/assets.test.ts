/* eslint-disable unicorn/no-null */
import { Wallet } from '@lace/cardano';
import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

import * as utils from './assets';

import type { Asset } from '../types/assets';

const testCases = [
  [
    [
      {
        assetId:
          'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de140736b7977616c6b6572',
        fingerprint: 'asset1dp5v4kerx7gjdrpphmsuway8enkuk3zlkkg4pg',
        name: '000de140736b7977616c6b6572',
        policyId: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
        quantity: '1',
        supply: '1',
        nftMetadata: {
          image: 'ipfs://zb2rhmjYFwxEiTjU5TgWpVWQMj4Dz14LBurTZrZfs8u4epV5m',
          mediaType: 'image/jpeg',
          name: '$skywalker',
          otherProperties: {},
          version: '1.0',
        },
        tokenMetadata: null,
      },
      BigInt(1),
    ],
    {
      name: 'skywalker',
      labeledName: '(222) skywalker',
      displayName: '$skywalker',
      fingerprint: 'asset1dp5v4kerx7gjdrpphmsuway8enkuk3zlkkg4pg',
      policy: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
      quantity: '1',
      unit: 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de140736b7977616c6b6572',
      decimals: 0,
      image:
        'https://ipfs.blockfrost.dev/ipfs/zb2rhmjYFwxEiTjU5TgWpVWQMj4Dz14LBurTZrZfs8u4epV5m',
    },
  ],
  [
    [
      {
        assetId:
          'aa0f536f65c1ffd33001a831c418f1e2f3105cfd9741bbcb6202aedc001bc280676f6f7365',
        fingerprint: 'asset1mrzfck4qrv0yzn70lwjd6ar93vth4maa6qqs2k',
        name: '001bc280676f6f7365',
        policyId: 'aa0f536f65c1ffd33001a831c418f1e2f3105cfd9741bbcb6202aedc',
        quantity: '600',
        supply: '600',
        nftMetadata: null,
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'goose',
      labeledName: '(444) goose',
      displayName: 'goose',
      fingerprint: 'asset1mrzfck4qrv0yzn70lwjd6ar93vth4maa6qqs2k',
      policy: 'aa0f536f65c1ffd33001a831c418f1e2f3105cfd9741bbcb6202aedc',
      quantity: '1',
      unit: 'aa0f536f65c1ffd33001a831c418f1e2f3105cfd9741bbcb6202aedc001bc280676f6f7365',
      decimals: 0,
      image: undefined,
    },
  ],
  [
    [
      {
        assetId:
          '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
        fingerprint: 'asset1sjk0uucljv4qxxnhq8gjy7r5mar64erhfuh4q8',
        name: '57696e67526964657273',
        policyId: '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7',
        quantity: '100000000000000',
        supply: '100000000000000',
        nftMetadata: null,
        tokenMetadata: {
          name: 'WingRiders Preprod Governance Token',
          url: 'https://app.preprod.wingriders.com',
          desc: 'WingRiders is a decentralized exchange protocol on Cardano. WRT provides access to dao voting and other DEX related functions.',
          ticker: 'tWRT',
          assetId:
            '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
          decimals: 6,
        },
      },
      BigInt('38709316'),
    ],
    {
      name: 'WingRiders',
      labeledName: 'WingRiders',
      displayName: 'WingRiders Preprod Governance Token',
      fingerprint: 'asset1sjk0uucljv4qxxnhq8gjy7r5mar64erhfuh4q8',
      policy: '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7',
      quantity: '38709316',
      unit: '659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a757696e67526964657273',
      decimals: 6,
      image: undefined,
    },
  ],
  [
    [
      {
        assetId:
          '8309083434b10b3af5e2b0da6214ac17e5989b4b7ccde44f157270a854657374',
        fingerprint: 'asset10jjmqtkt08mzrpa5w7d9sn5dlus8rp75vt0ta5',
        name: '54657374',
        policyId: '8309083434b10b3af5e2b0da6214ac17e5989b4b7ccde44f157270a8',
        quantity: '1',
        supply: '1',
        nftMetadata: {
          description: 'test',
          files: [
            {
              mediaType: 'image/jpeg',
              name: 'test',
              src: 'ipfs://QmNeYAJ98duYmZnesM4m2TDQxc8vGfv225fcTTa1UMn2kL',
            },
          ],
          image: 'ipfs://QmNeYAJ98duYmZnesM4m2TDQxc8vGfv225fcTTa1UMn2kL',
          mediaType: 'image/jpeg',
          name: 'test',
          version: '1.0',
        },
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'Test',
      labeledName: 'Test',
      displayName: 'test',
      fingerprint: 'asset10jjmqtkt08mzrpa5w7d9sn5dlus8rp75vt0ta5',
      policy: '8309083434b10b3af5e2b0da6214ac17e5989b4b7ccde44f157270a8',
      quantity: '1',
      unit: '8309083434b10b3af5e2b0da6214ac17e5989b4b7ccde44f157270a854657374',
      decimals: 0,
      image:
        'https://ipfs.blockfrost.dev/ipfs/QmNeYAJ98duYmZnesM4m2TDQxc8vGfv225fcTTa1UMn2kL',
    },
  ],
  [
    [
      {
        assetId:
          'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
        fingerprint: 'asset1marrj9cp99pa9ag4evkucsrj6uk0vckecktksl',
        name: '4d494e',
        policyId: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72',
        quantity: '45000000000000000',
        supply: '45000000000000000',
        nftMetadata: null,
        tokenMetadata: null,
      },
      BigInt('67280096'),
    ],
    {
      name: 'MIN',
      labeledName: 'MIN',
      displayName: 'MIN',
      fingerprint: 'asset1marrj9cp99pa9ag4evkucsrj6uk0vckecktksl',
      policy: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72',
      quantity: '67280096',
      unit: 'e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e',
      decimals: 0,
      image: undefined,
    },
  ],
  [
    [
      {
        assetId:
          '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
        fingerprint: 'asset14amr4cepgv90u862p845l0vesxv2xpjqk4nup7',
        name: '6261746d616e',
        policyId: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f',
        quantity: '1',
        supply: '1',
        nftMetadata: null,
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'batman',
      labeledName: 'batman',
      displayName: 'batman',
      fingerprint: 'asset14amr4cepgv90u862p845l0vesxv2xpjqk4nup7',
      policy: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f',
      quantity: '1',
      unit: '359289937f6cd0478f2c0737eed4ba879725c09d9d80caeeadf4a67f6261746d616e',
      decimals: 0,
      image: undefined,
    },
  ],
  [
    [
      {
        assetId:
          '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
        fingerprint: 'asset1td7qdtk2rmyktdcezzv33askkuddh8a4sl46jj',
        name: '74657374',
        policyId: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f395',
        quantity: '1',
        supply: '1',
        nftMetadata: {
          image: [
            'ipfs://test',
            'asset1td7qdtk2rmyktdcezzv33askkuddh8a4sl46jj',
          ],
        },
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'test',
      labeledName: 'test',
      displayName: 'test',
      fingerprint: 'asset1td7qdtk2rmyktdcezzv33askkuddh8a4sl46jj',
      policy: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f395',
      quantity: '1',
      unit: '4298bc56195ebed886f2172eb0352a26611ce34f4482a3ee3cc0f39574657374',
      decimals: 0,
      image:
        'https://ipfs.blockfrost.dev/ipfs/testasset1td7qdtk2rmyktdcezzv33askkuddh8a4sl46jj',
    },
  ],
  [
    [
      {
        assetId:
          'f0d1923af53e2b0c25cecdd8efba5672897f89479fa18acf5ff7eb2a4e46542d66696c6573',
        fingerprint: 'asset1xucvq2hkl0n4y2fnqxkjynp6l57zdmus9uuyhr',
        name: '4e46542d66696c6573',
        policyId: 'f0d1923af53e2b0c25cecdd8efba5672897f89479fa18acf5ff7eb2a',
        quantity: '1',
        supply: '1',
        nftMetadata: {
          description: 'NFT with different types of files',
          files: [
            {
              mediaType: 'video/mp4',
              name: 'some name',
              src: 'ipfs://Qmb78QQ4RXxKQrteRn4X3WaMXXfmi2BU2dLjfWxuJoF2N5',
            },
            {
              mediaType: 'audio/mpeg',
              name: 'some name',
              src: 'ipfs://Qmb78QQ4RXxKQrteRn4X3WaMXXfmi2BU2dLjfWxuJoF2Ny',
            },
          ],
          image: 'ipfs://somehash',
          mediaType: 'image/png',
          name: 'NFT with files',
          otherProperties: {},
          version: '1.0',
        },
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'NFT-files',
      labeledName: 'NFT-files',
      displayName: 'NFT with files',
      fingerprint: 'asset1xucvq2hkl0n4y2fnqxkjynp6l57zdmus9uuyhr',
      policy: 'f0d1923af53e2b0c25cecdd8efba5672897f89479fa18acf5ff7eb2a',
      quantity: '1',
      unit: 'f0d1923af53e2b0c25cecdd8efba5672897f89479fa18acf5ff7eb2a4e46542d66696c6573',
      decimals: 0,
      image: 'https://ipfs.blockfrost.dev/ipfs/somehash',
    },
  ],
  [
    [
      {
        assetId:
          '171163f05e4f30b6be3c22668c37978e7d508b84f83558e523133cdf74454d50',
        fingerprint: 'asset1n3h47u7gxcvh0ldfw7pz0k2d0qem6kvrwuvtu7',
        name: '74454d50',
        policyId: '171163f05e4f30b6be3c22668c37978e7d508b84f83558e523133cdf',
        quantity: '200000000000000',
        supply: '200000000000000',
        nftMetadata: null,
        tokenMetadata: {
          name: 'tEMP',
          url: 'https://empowa.io',
          desc: 'Testnet version of the Empowa utility token (EMP).',
          ticker: 'tEMP',
          icon: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          assetId:
            '171163f05e4f30b6be3c22668c37978e7d508b84f83558e523133cdf74454d50',
          decimals: 6,
        },
      },
      BigInt('49433000000'),
    ],
    {
      name: 'tEMP',
      labeledName: 'tEMP',
      displayName: 'tEMP',
      fingerprint: 'asset1n3h47u7gxcvh0ldfw7pz0k2d0qem6kvrwuvtu7',
      policy: '171163f05e4f30b6be3c22668c37978e7d508b84f83558e523133cdf',
      quantity: '49433000000',
      unit: '171163f05e4f30b6be3c22668c37978e7d508b84f83558e523133cdf74454d50',
      decimals: 6,
      image:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    },
  ],
  [
    [
      {
        assetId:
          '28c380222b13ebd7ac76d751e54205179ea065f90acbc95ecafad129576f726c64204d6f62696c65205365656420546573742031353735',
        fingerprint: 'asset1dzkanr70q3kcfry9atzkhv6xus57zz033x9q9n',
        name: '576f726c64204d6f62696c65205365656420546573742031353735',
        policyId: '28c380222b13ebd7ac76d751e54205179ea065f90acbc95ecafad129',
        quantity: '1',
        supply: '1',
        nftMetadata: {
          description:
            'A RealFi NFT with Real World Impact in Housing and Connectivity',
          files: [
            {
              mediaType: 'video/mp4',
              name: 'Seed Animation',
              src: 'ipfs://QmeajbzNQ9j6e3kqrxC55n7eXRn2dmU2w6LNSgVVZJr49o',
            },
            {
              mediaType: 'text/plain',
              name: 'NFT Sale Terms',
              src: 'ipfs://QmcfUQJg8J8u48XE5stTEDTFTYLe7q3sWfQBBB2xmxrxEw',
            },
          ],
          image: 'ipfs://QmRm3EMVM1DgPYKPenxRXq6rd8ZUioDfjmV64yejUGS46H',
          mediaType: 'image/jpeg',
          name: 'World Mobile Seed Test 1575',
          otherProperties: {},
          version: '1.0',
        },
        tokenMetadata: null,
      },
      BigInt('1'),
    ],
    {
      name: 'World Mobile Seed Test 1575',
      labeledName: 'World Mobile Seed Test 1575',
      displayName: 'World Mobile Seed Test 1575',
      fingerprint: 'asset1dzkanr70q3kcfry9atzkhv6xus57zz033x9q9n',
      policy: '28c380222b13ebd7ac76d751e54205179ea065f90acbc95ecafad129',
      quantity: '1',
      unit: '28c380222b13ebd7ac76d751e54205179ea065f90acbc95ecafad129576f726c64204d6f62696c65205365656420546573742031353735',
      decimals: 0,
      image:
        'https://ipfs.blockfrost.dev/ipfs/QmRm3EMVM1DgPYKPenxRXq6rd8ZUioDfjmV64yejUGS46H',
    },
  ],
];

describe('toAsset', () => {
  for (const [[asset, quantity], output] of testCases) {
    it(`should convert asset info with assetId ${asset.assetId}`, () => {
      const result = utils.toAsset(asset, quantity);

      expect(result).toMatchObject(output);
    });
  }
});

describe('useAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return empty list if there are no assets and no coins', () => {
    const total = of({
      coins: BigInt(0),
      assets: undefined,
    });
    const assetInfo = of(new Map());
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([]);
    expect(result.current.nfts).toMatchObject([]);
  });

  it('should return empty list if there are no coins and assets list is empty', () => {
    const total = of({
      coins: BigInt(0),
      assets: new Map(),
    });
    const assetInfo = of(new Map());
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([]);
    expect(result.current.nfts).toMatchObject([]);
  });

  it('should return empty list if there are no matching assets info', () => {
    const total = of({
      coins: BigInt(0),
      assets: new Map([
        [
          Wallet.Cardano.AssetId(
            '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
          ),
          BigInt(2_000_000),
        ],
      ]),
    });
    const assetInfo = of(new Map());
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([]);
    expect(result.current.nfts).toMatchObject([]);
  });

  it('should return proper nfts list if there is only asset which is of nft type', () => {
    const assetID = Wallet.Cardano.AssetId(
      '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    );
    const toAssetResult =
      `toAssetResult${assetID.toString()}` as unknown as Asset;
    const spy = jest.spyOn(utils, 'toAsset');
    spy.mockReturnValue(toAssetResult);

    const total = of({
      coins: BigInt(0),
      assets: new Map([[assetID, BigInt(2_000_000)]]),
    });
    const assetInfo = of(
      new Map([
        [
          assetID,
          {
            supply: BigInt(1),
            nftMetadata: true,
            assetId:
              'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a000de1406b6c6f73',
          },
        ],
      ]) as unknown as Wallet.Assets,
    );
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([]);
    expect(result.current.nfts).toMatchObject([toAssetResult]);
    spy.mockRestore();
  });

  it('should return empty list if there is only asset with zero balance', () => {
    const assetID = Wallet.Cardano.AssetId(
      '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    );

    const total = of({
      coins: BigInt(0),
      assets: new Map([[assetID, BigInt(0)]]),
    });
    const assetInfo = of(
      new Map([[assetID, { supply: BigInt(1) }]]) as unknown as Wallet.Assets,
    );
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([]);
    expect(result.current.nfts).toMatchObject([]);
  });

  it('should return cardano as an asset in the list', () => {
    const total = of({
      coins: BigInt(0),
      assets: new Map(),
    });
    const assetInfo = of(new Map());
    const balance = {
      totalCoins: BigInt(1),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([
      {
        unit: 'lovelace',
        quantity: (
          balance.totalCoins -
          balance.lockedCoins -
          balance.unspendableCoins
        ).toString(),
      },
    ]);
    expect(result.current.nfts).toMatchObject([]);
  });

  it('should return properly mapped asset in the list', () => {
    const assetID = Wallet.Cardano.AssetId(
      '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    );
    const toAssetResult =
      `toAssetResult${assetID.toString()}` as unknown as Asset;
    const spy = jest.spyOn(utils, 'toAsset');
    spy.mockReturnValue(toAssetResult);

    const total = of({
      coins: BigInt(0),
      assets: new Map([[assetID, BigInt(2_000_000)]]),
    });
    const assetInfo = of(
      new Map([
        [assetID, { supply: BigInt(2), assetId: '' }],
      ]) as unknown as Wallet.Assets,
    );
    const balance = {
      totalCoins: BigInt(0),
      unspendableCoins: BigInt(0),
      lockedCoins: BigInt(0),
    };
    const { result } = renderHook((...props) =>
      utils.useAssets({
        inMemoryWallet: {
          balance: {
            utxo: {
              total$: total,
            },
          },
          assetInfo$: assetInfo,
        } as unknown as Wallet.ObservableWallet,
        balance,
        ...props,
      }),
    );

    expect(result.current.assets).toMatchObject([toAssetResult]);
    expect(result.current.nfts).toMatchObject([]);
    spy.mockRestore();
  });
});

describe('searchTokens', () => {
  it('should return empty list if there are no assets matching search criteria', () => {
    const assets = [
      {
        name: 'name',
        displayName: 'displayName',
        policy: 'policy',
        fingerprint: 'fingerprint',
      },
    ] as Asset[];

    expect(utils.searchTokens(assets, 'value')).toMatchObject([]);
  });

  it('should return an item if there is a match by name field', () => {
    const search = 'somestring';
    const assets = [
      {
        name: `na${search}me`,
        displayName: 'displayName',
        policy: 'policy',
        fingerprint: 'fingerprint',
      },
    ] as Asset[];

    expect(utils.searchTokens(assets, search)).toMatchObject(assets);
  });

  it('should return an item if there is a match by displayName field', () => {
    const search = 'somestring';
    const assets = [
      {
        name: 'name',
        displayName: `displa${search}yName`,
        policy: 'policy',
        fingerprint: 'fingerprint',
      },
    ] as Asset[];

    expect(utils.searchTokens(assets, search)).toMatchObject(assets);
  });

  it('should return an item if there is a match by policy field', () => {
    const search = 'somestring';
    const assets = [
      {
        name: 'name',
        displayName: 'displayName',
        policy: `pol${search}icy`,
        fingerprint: 'fingerprint',
      },
    ] as Asset[];

    expect(utils.searchTokens(assets, search)).toMatchObject(assets);
  });

  it('should return an item if there is a match by fingerprint field', () => {
    const search = 'somestring';
    const assets = [
      {
        name: 'name',
        displayName: 'displayName',
        policy: 'policy',
        fingerprint: `finge${search}rprint`,
      },
    ] as Asset[];

    expect(utils.searchTokens(assets, search)).toMatchObject(assets);
  });
});
