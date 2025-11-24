// cSpell:ignore adaseal atada pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers, camelcase */
import { getCacheKey, initStakePoolService } from '../stakePoolService';
import { Cardano, NetworkInfoProvider, SupplySummary } from '@cardano-sdk/core';
import { BlockfrostClient } from '@cardano-sdk/cardano-services-client';
import { Storage } from 'webextension-polyfill';
import { fromSerializableObject } from '@cardano-sdk/util';

const cacheKey = getCacheKey('Mainnet');

const genesisParameters = fromSerializableObject({
  activeSlotsCoefficient: 0.05,
  epochLength: 432_000,
  maxKesEvolutions: 62,
  maxLovelaceSupply: { __type: 'bigint', value: '45000000000000000' },
  networkId: 1,
  networkMagic: 764_824_073,
  securityParameter: 2160,
  slotLength: 1,
  slotsPerKesPeriod: 129_600,
  systemStart: { __type: 'Date', value: 1_506_203_091_000 },
  updateQuorum: 5
}) as Cardano.CompactGenesis;

const lovelaceSupply = fromSerializableObject({
  circulating: { __type: 'bigint', value: '36468773114675600' },
  total: { __type: 'bigint', value: '37963001775752986' }
}) as SupplySummary;

const protocolParameters = fromSerializableObject({
  coinsPerUtxoByte: 4310,
  collateralPercentage: 150,
  committeeTermLimit: 0,
  costModels: {
    __type: 'Map',
    value: [
      [
        0,
        [
          100_788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59_957, 4, 1, 11_183, 32, 201_305, 8356, 4, 16_000, 100, 16_000,
          100, 16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 100, 100, 16_000, 100, 94_375, 32, 132_994, 32,
          61_462, 4, 72_010, 178, 0, 1, 22_151, 32, 91_189, 769, 4, 2, 85_848, 228_465, 122, 0, 1, 1, 1000, 42_921, 4,
          2, 24_548, 29_498, 38, 1, 898_148, 27_279, 1, 51_775, 558, 1, 39_184, 1000, 60_594, 1, 141_895, 32, 83_150,
          32, 15_299, 32, 76_049, 1, 13_169, 4, 22_100, 10, 28_999, 74, 1, 28_999, 74, 1, 43_285, 552, 1, 44_749, 541,
          1, 33_852, 32, 68_246, 32, 72_362, 32, 7243, 32, 7391, 32, 11_546, 32, 85_848, 228_465, 122, 0, 1, 1, 90_434,
          519, 0, 1, 74_433, 32, 85_848, 228_465, 122, 0, 1, 1, 85_848, 228_465, 122, 0, 1, 1, 270_652, 22_588, 4,
          1_457_325, 64_566, 4, 20_467, 1, 4, 0, 141_992, 32, 100_788, 420, 1, 1, 81_663, 32, 59_498, 32, 20_142, 32,
          24_588, 32, 20_744, 32, 25_933, 32, 24_623, 32, 53_384_111, 14_333, 10
        ]
      ],
      [
        1,
        [
          100_788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59_957, 4, 1, 11_183, 32, 201_305, 8356, 4, 16_000, 100, 16_000,
          100, 16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 100, 100, 16_000, 100, 94_375, 32, 132_994, 32,
          61_462, 4, 72_010, 178, 0, 1, 22_151, 32, 91_189, 769, 4, 2, 85_848, 228_465, 122, 0, 1, 1, 1000, 42_921, 4,
          2, 24_548, 29_498, 38, 1, 898_148, 27_279, 1, 51_775, 558, 1, 39_184, 1000, 60_594, 1, 141_895, 32, 83_150,
          32, 15_299, 32, 76_049, 1, 13_169, 4, 22_100, 10, 28_999, 74, 1, 28_999, 74, 1, 43_285, 552, 1, 44_749, 541,
          1, 33_852, 32, 68_246, 32, 72_362, 32, 7243, 32, 7391, 32, 11_546, 32, 85_848, 228_465, 122, 0, 1, 1, 90_434,
          519, 0, 1, 74_433, 32, 85_848, 228_465, 122, 0, 1, 1, 85_848, 228_465, 122, 0, 1, 1, 955_506, 213_312, 0, 2,
          270_652, 22_588, 4, 1_457_325, 64_566, 4, 20_467, 1, 4, 0, 141_992, 32, 100_788, 420, 1, 1, 81_663, 32,
          59_498, 32, 20_142, 32, 24_588, 32, 20_744, 32, 25_933, 32, 24_623, 32, 43_053_543, 10, 53_384_111, 14_333,
          10, 43_574_283, 26_308, 10
        ]
      ]
    ]
  },
  dRepDeposit: 500_000_000,
  dRepInactivityPeriod: 0,
  dRepVotingThresholds: null,
  desiredNumberOfPools: 500,
  governanceActionDeposit: 100_000_000_000,
  governanceActionValidityPeriod: 0,
  maxBlockBodySize: 90_112,
  maxBlockHeaderSize: 1100,
  maxCollateralInputs: 3,
  maxExecutionUnitsPerBlock: { memory: 62_000_000, steps: 20_000_000_000 },
  maxExecutionUnitsPerTransaction: { memory: 14_000_000, steps: 10_000_000_000 },
  maxTxSize: 16_384,
  maxValueSize: 5000,
  minCommitteeSize: 0,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
  minPoolCost: 170_000_000,
  monetaryExpansion: '0.003',
  poolDeposit: 500_000_000,
  poolInfluence: '0.3',
  poolRetirementEpochBound: 18,
  poolVotingThresholds: null,
  prices: { memory: 0.0577, steps: 0.000_072_1 },
  protocolVersion: { major: 10, minor: 0 },
  stakeKeyDeposit: 2_000_000,
  treasuryExpansion: '0.2'
}) as Cardano.ProtocolParameters;

// cSpell:disable
const pools = [
  {
    pool_id: 'pool1z5uqdk7dzdxaae5633fqfcu2eqzy3a3rgtuvy087fdld7yws0xt',
    hex: '153806dbcd134ddee69a8c5204e38ac80448f62342f8c23cfe4b7edf',
    active_stake: '59957528758691',
    live_stake: '59265713550010',
    live_saturation: 0.780_572_014_564_231_3,
    blocks_minted: 18_659,
    margin_cost: 0.009,
    fixed_cost: '340000000',
    declared_pledge: '300000000000',
    metadata: {
      hash: 'ca7d12decf886e31f5226b5946c62edc81a7e40af95ce7cd6465122e309d5626',
      url: 'https://raw.githubusercontent.com/Octalus/cardano/master/p.json',
      ticker: 'OCTAS',
      name: 'OctasPool',
      description: "Octa's Performance Pool",
      homepage: 'https://octaluso.dyndns.org'
    }
  },
  {
    pool_id: 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
    hex: '0f292fcaa02b8b2f9b3c8f9fd8e0bb21abedb692a6d5058df3ef2735',
    active_stake: '6197512081537',
    live_stake: '6201196221924',
    live_saturation: 0.081_674_208_200_847_7,
    blocks_minted: 3294,
    margin_cost: 0.049,
    fixed_cost: '340000000',
    declared_pledge: '250000000000',
    metadata: {
      hash: '47c0c68cb57f4a5b4a87bad896fc274678e7aea98e200fa14a1cb40c0cab1d8c',
      url: 'https://stakenuts.com/mainnet.json',
      ticker: 'NUTS',
      name: 'StakeNuts',
      description: 'StakeNuts.com',
      homepage: 'https://stakenuts.com/'
    }
  },
  {
    pool_id: 'pool1q80jjs53w0fx836n8g38gtdwr8ck5zre3da90peuxn84sj3cu0r',
    hex: '01df29429173d263c7533a22742dae19f16a08798b7a57873c34cf58',
    active_stake: '9317117829983',
    live_stake: '9299866474415',
    live_saturation: 0.122_485_921_020_54,
    blocks_minted: 2628,
    margin_cost: 0,
    fixed_cost: '170000000',
    declared_pledge: '20000000000',
    metadata: {
      hash: '34fdde237812fab14d29a80423bb295f39122f4fea1aae31b902bf85ac927b5e',
      url: 'https://ispool.live/metadata',
      ticker: '000',
      name: 'Switzerland Investment',
      description:
        'Stability, Security, Reliability, Neutrality! Stake pool server is located in our own mini data center in Switzerland with nodes in Europe.',
      homepage: 'https://ispool.live/'
    }
  },
  {
    pool_id: 'pool1ddskftmsscw92d7vnj89pldwx5feegkgcmamgt5t0e4lkd7mdp8',
    hex: '6b6164af70861c5537cc9c8e50fdae35139ca2c8c6fbb42e8b7e6bfb',
    active_stake: '2671108363',
    live_stake: '2671108363',
    live_saturation: 0.000_035_180_415_642_290_434,
    blocks_minted: 23,
    margin_cost: 0.05,
    fixed_cost: '340000000',
    declared_pledge: '7149000000',
    metadata: {
      hash: '79e7cf8d936bf0ced040516b288e2edc76f2f87af5400f92010a682de3a052e9',
      url: 'https://pool.adascan.net/meta/v1/poolmeta.json',
      ticker: null,
      name: null,
      description: null,
      homepage: null
    }
  },
  {
    pool_id: 'pool1qqqqqdk4zhsjuxxd8jyvwncf5eucfskz0xjjj64fdmlgj735lr9',
    hex: '00000036d515e12e18cd3c88c74f09a67984c2c279a5296aa96efe89',
    active_stake: '65102162645894',
    live_stake: '65326667368036',
    live_saturation: 0.860_399_129_577_791,
    blocks_minted: 21_904,
    margin_cost: 0.01,
    fixed_cost: '340000000',
    declared_pledge: '1300000000000',
    metadata: {
      hash: '4811109f4fa6e2c1e3077fde6d1aa3120cc7a9edbd11d2c07a7828e452b48803',
      url: 'https://stakepool.at/atada.metadata3.json',
      ticker: 'ATADA',
      name: 'ATADA Stakepool in Austria',
      description:
        'Stake safe and secure in beautiful Austria! Please join our Telegram channel https://t.me/atada_stakepool_austria',
      homepage: 'https://stakepool.at'
    }
  },
  {
    pool_id: 'pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt',
    hex: '7d59eb08203e86f74d3011c7e967ed50fbd0954001eab1cb00b69422',
    active_stake: '1866533268449',
    live_stake: '1881463142839',
    live_saturation: 0.024_780_220_936_594_807,
    blocks_minted: 687,
    margin_cost: 0,
    fixed_cost: '170000000',
    declared_pledge: '60000000000',
    metadata: {
      hash: '06179016bb99292a607ffea0dd7deba50483fa19195a6ce02854805657195658',
      url: 'https://adaseal.eu/poolMetaData.json',
      ticker: 'SEAL',
      name: 'adaseal.eu',
      description:
        'Community pool - Dedicated HA cluster, server room, 0% margin. 10% of profits donated to seal sanctuaries and zoos.',
      homepage: 'https://adaseal.eu'
    }
  }
];

const poolDetails = {
  pool_id: 'pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt',
  hex: '7d59eb08203e86f74d3011c7e967ed50fbd0954001eab1cb00b69422',
  vrf_key: '0834f7e3aa91f7bfd2c7f3b9b8f5535e6d4669bc3ba594557fd7c85566833d2e',
  blocks_minted: 687,
  blocks_epoch: 0,
  live_stake: '1881463142839',
  live_size: 0.000_085_497_332_447_347_12,
  live_saturation: 0.024_780_220_936_594_807,
  live_delegators: 175,
  active_stake: '1866533268449',
  active_size: 0.000_084_624_567_505_387_23,
  declared_pledge: '60000000000',
  live_pledge: '87313446210',
  margin_cost: 0,
  fixed_cost: '170000000',
  reward_account: 'stake1uyu2yd2szukyx7zfsvemtefte6g4680e7v9r4wwgt8fccxck0a3ks',
  owners: [
    'stake1uyu2yd2szukyx7zfsvemtefte6g4680e7v9r4wwgt8fccxck0a3ks',
    'stake1ux5m5uxees449gxfz534vvg6yw2c62chdua3nxlf7cu6p3gxn4ts9'
  ],
  registration: [
    'dc23613d68e093a675bf3dd5e9d3648215a25e64a8d376d6411cd24fed0af588',
    'ffd06dc6c56039312f90fb0af7227dc9586e79c94c58fd1f11bc349d5cc62749',
    '7325a08617c1de53b536dfd5f85cdd2f6bd8aa13b64c1e29ac571003336851d4',
    'd25406a6b9d88144c4cf55d8f052c439a879059747217d8ff398ac308c2eed79',
    '302a81d685a06a06026e6848dcfdbe44d3af43a68acb1888e08dcdacdf370ed1',
    '10243e6c3af06eb062f8b7f7a46b4fa34248a84bdfd0af7438345e461b79463b',
    '8a3f2c79356627d86f730ce32ba2b7c7296f5e6b12b267cef8a2c546aba7f9e1',
    '12d3cd743733b5d1bb5415ef4c3cc645194d2427518a49b914922ec00cde2aeb',
    '771617c11514e74fb0da72defa4221e7af3c6f1edfa5c98e55494198e11ac618',
    '858ba1ba075a710f70c63013363708f4da4776ef18f6c4f3eaba5299599ea9aa',
    '0d6a5413720e5abbbee823e783bcbfc0af89acfbf9456bddf360c7c3f3e2f80a',
    'b5c38c17a6ade7e86a2ba672f8d3f90747c60ed6dfae4c894180f363e9a187c9',
    '55dc0fbf9ccd97fe6eb6c9a6b4fae019507e4e91abca2d18f0c07671b499c64a',
    '9cafcbffbc0b4c9dcadb1cc7ff03a05f53e993d3bcc743a8c1fff8288cb41ab2',
    '18d56a3cfca1a6f6fa50703b3b6995988876bfcbb0a6a8e4b4023d4d8a1060fe',
    'a1876cd0dc88dd92df00c25b67885d8d1dd4ff3395c84e8dd43a91996742d296',
    'f67b52e2bc0ade761998ecfa66f282b40b558d05ac4900d170020c0434d28946',
    'a4ecafa126fa2605c8c4c9a34442a58685dccf8e57911feb3521accad22e8a0d',
    'ee3875c41591dd87841debff9738a9a3ce37a5a2d53784fb50247e826c3cf84c'
  ],
  retirement: [],
  calidus_key: null
};

const poolMetadata = {
  pool_id: 'pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt',
  hex: '7d59eb08203e86f74d3011c7e967ed50fbd0954001eab1cb00b69422',
  url: 'https://adaseal.eu/poolMetaData.json',
  hash: '06179016bb99292a607ffea0dd7deba50483fa19195a6ce02854805657195658',
  ticker: 'SEAL',
  name: 'adaseal.eu',
  description:
    'Community pool - Dedicated HA cluster, server room, 0% margin. 10% of profits donated to seal sanctuaries and zoos.',
  homepage: 'https://adaseal.eu'
};
// cSpell:enable

describe('initStakePoolService', () => {
  let blockfrostClientMock: jest.Mocked<BlockfrostClient>;
  let extensionLocalStorageMock: jest.Mocked<Storage.LocalStorageArea>;
  let networkInfoProviderMock: jest.Mocked<NetworkInfoProvider>;
  let nextBFCallHangs = false;
  let nextBFCallThrows = false;
  let resolver: (value: unknown) => void;

  const init = () =>
    initStakePoolService({
      blockfrostClient: blockfrostClientMock,
      chainName: 'Mainnet',
      extensionLocalStorage: extensionLocalStorageMock,
      networkInfoProvider: networkInfoProviderMock
    });

  beforeEach(() => {
    // Create mocks
    blockfrostClientMock = {
      request: jest.fn()
    } as unknown as jest.Mocked<BlockfrostClient>;

    extensionLocalStorageMock = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    } as unknown as jest.Mocked<Storage.LocalStorageArea>;

    networkInfoProviderMock = {
      genesisParameters: jest.fn(),
      lovelaceSupply: jest.fn(),
      protocolParameters: jest.fn(),
      networkId: jest.fn(),
      ledgerTip: jest.fn(),
      currentWalletProtocolParameters: jest.fn(),
      stake: jest.fn(),
      eraSummaries: jest.fn(),
      timeSettings: jest.fn()
    } as unknown as jest.Mocked<NetworkInfoProvider>;

    // Set default mocks
    blockfrostClientMock.request.mockImplementation(async (url: string) => {
      if (nextBFCallThrows) {
        nextBFCallThrows = false;
        throw new Error('Test BF Error');
      }

      if (nextBFCallHangs) {
        nextBFCallHangs = false;
        await new Promise((resolve) => (resolver = resolve));
      }

      if (url === 'network') return { stake: { live: '21877143906293058' }, supply: { reserves: '7036998224247014' } };

      // cSpell:disable-next-line
      if (url === 'pools/retiring') return [{ pool_id: 'pool1qqqqqdk4zhsjuxxd8jyvwncf5eucfskz0xjjj64fdmlgj735lr9' }];

      if (url.startsWith('pools/extended')) return pools;

      if (url === 'pools/pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt') return poolDetails;

      if (url === 'pools/pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt/metadata') return poolMetadata;

      throw new Error(`Unexpected URL in blockfrostClientMock: ${url}`);
    });

    extensionLocalStorageMock.get.mockResolvedValue({ [cacheKey]: undefined });
    extensionLocalStorageMock.set.mockResolvedValue();

    networkInfoProviderMock.genesisParameters.mockResolvedValue(genesisParameters);
    networkInfoProviderMock.lovelaceSupply.mockResolvedValue(lovelaceSupply);
    networkInfoProviderMock.protocolParameters.mockResolvedValue(protocolParameters);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const stakePoolProvider = init();

      let result = await stakePoolProvider.healthCheck();
      expect(result).toEqual({ ok: false }); // Initially false until data is fetched

      // Fetched data are mocked, it should be quite fast
      await new Promise((resolve) => setTimeout(resolve, 1));

      result = await stakePoolProvider.healthCheck();
      expect(result).toEqual({ ok: true }); // True after data is fetched
    });
  });

  describe('stakePoolStats', () => {
    it('should return stake pool stats', async () => {
      const stakePoolProvider = init();

      const result = await stakePoolProvider.stakePoolStats();

      expect(result).toEqual({ qty: { activating: 0, active: 5, retired: 0, retiring: 1 } });
    });
  });

  describe('queryStakePools', () => {
    it('should query stake pools with basic parameters', async () => {
      const stakePoolProvider = init();

      const result = await stakePoolProvider.queryStakePools({ pagination: { startAt: 0, limit: 10 } });

      expect(result.totalResultCount).toBe(6);
    });

    it('should filter stake pools by text search', async () => {
      const stakePoolProvider = init();

      const result = await stakePoolProvider.queryStakePools({
        filters: { text: 'seal' },
        pagination: { startAt: 0, limit: 10 }
      });

      expect(result.totalResultCount).toBe(1);
      expect(result.pageResults[0].metadata?.ticker).toBe('SEAL');
    });

    it('should filter stake pools by pledge met', async () => {
      const stakePoolProvider = init();

      const result = await stakePoolProvider.queryStakePools({
        filters: { pledgeMet: true },
        pagination: { startAt: 0, limit: 10 }
      });

      // Only ada scan mocked pool has live stake less than declared pledge
      expect(result.totalResultCount).toBe(5);
    });

    it('should handle retiring pools correctly', async () => {
      const stakePoolProvider = init();

      const result = await stakePoolProvider.queryStakePools({
        filters: { text: 'atada' },
        pagination: { startAt: 0, limit: 10 }
      });

      expect(result.totalResultCount).toBe(1);
      expect(result.pageResults[0].metadata?.ticker).toBe('ATADA');
      expect(result.pageResults[0].status).toBe(Cardano.StakePoolStatus.Retiring);
    });

    it('should handle pagination correctly', async () => {
      const stakePoolProvider = init();

      const result1 = await stakePoolProvider.queryStakePools({
        pagination: { startAt: 0, limit: 4 }
      });

      expect(result1.totalResultCount).toBe(6);
      expect(result1.pageResults).toHaveLength(4);

      const result2 = await stakePoolProvider.queryStakePools({
        pagination: { startAt: 4, limit: 4 }
      });

      expect(result2.totalResultCount).toBe(6);
      expect(result2.pageResults).toHaveLength(2);

      // Check that the results are different
      expect(result1.pageResults.some(({ id }) => result2.pageResults.some((pool) => pool.id === id))).toBeFalsy();
    });

    it('should enrich stake pools queried by id', async () => {
      const stakePoolProvider = init();

      const result1 = await stakePoolProvider.queryStakePools({
        filters: { text: 'seal' },
        pagination: { startAt: 0, limit: 10 }
      });

      expect(result1.totalResultCount).toBe(1);
      expect(result1.pageResults[0].metadata?.ticker).toBe('SEAL');
      // Live pledge is not available for all the pools
      expect(result1.pageResults[0].metrics?.livePledge).toBe(BigInt(0));

      // The calls performed by init
      const initCalls = [['pools/extended?count=100&page=1'], ['network'], ['pools/retiring']];
      expect(blockfrostClientMock.request.mock.calls).toEqual(initCalls);

      const result2 = await stakePoolProvider.queryStakePools({
        filters: { identifier: { values: [{ id: result1.pageResults[0].id }] } },
        pagination: { startAt: 0, limit: 10 }
      });

      expect(result2.totalResultCount).toBe(1);
      expect(result2.pageResults[0].metadata?.ticker).toBe('SEAL');
      // Live pledge is available for pools queried by id
      expect(result2.pageResults[0].metrics?.livePledge).toBe(BigInt('87313446210'));

      expect(blockfrostClientMock.request.mock.calls).toEqual([
        ...initCalls,
        // The call performed to fetch stake pool details
        ['pools/pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt']
      ]);
    });

    it('should respond to stake pools queries by id even if the data is not loaded', async () => {
      nextBFCallHangs = true;

      const stakePoolProvider = init();

      // Wait a while to let init to call the hanging promise, otherwise next queryStakePools call will hit it
      while (blockfrostClientMock.request.mock.calls.length === 0)
        await new Promise((resolve) => setTimeout(resolve, 1));

      expect(blockfrostClientMock.request.mock.calls).toEqual([
        // The first call performed by init, the hanging one
        ['pools/extended?count=100&page=1']
      ]);

      const result = await stakePoolProvider.queryStakePools({
        filters: { identifier: { values: [{ id: 'pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt' }] } },
        pagination: { startAt: 0, limit: 10 }
      });

      expect(result.totalResultCount).toBe(1);
      expect(result.pageResults[0].metadata?.ticker).toBe('SEAL');
      expect(blockfrostClientMock.request.mock.calls).toEqual([
        // The first call performed by init, the hanging one
        ['pools/extended?count=100&page=1'],
        // The call performed to fetch stake pool details, this is not a proof as it is called either way
        ['pools/pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt'],
        // The call performed to fetch stake pool metadata, this ensures the flow is the one expected
        ['pools/pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt/metadata']
      ]);

      // Resolve the hanging promise to free resources
      resolver('test');
    });
  });

  describe('error handling', () => {
    describe('init errors', () => {
      it('init should not throw in case of errors and error should be propagated to StakePoolProvider methods', async () => {
        extensionLocalStorageMock.get.mockRejectedValue(new Error('Test Storage Error'));

        const stakePoolProvider = init();

        await expect(stakePoolProvider.stakePoolStats()).rejects.toThrow('Test Storage Error');
      });

      it('init should not throw in case of fetchData errors and error should be propagated to StakePoolProvider methods', async () => {
        nextBFCallThrows = true;

        const stakePoolProvider = init();

        await expect(stakePoolProvider.stakePoolStats()).rejects.toThrow('Test BF Error');
      });
    });

    describe('asyncFetchData errors recovery', () => {
      it('in case of errors, asyncFetchData should recover', async () => {
        nextBFCallThrows = true;

        const stakePoolProvider = init();

        // In case of error, StakePoolProvider methods fire an asyncFetchData call
        await expect(stakePoolProvider.stakePoolStats()).rejects.toThrow('Test BF Error');

        // Give asyncFetchData a while to recover
        await new Promise((resolve) => setTimeout(resolve, 1));

        await expect(stakePoolProvider.stakePoolStats()).resolves.not.toThrow();
        await expect(stakePoolProvider.healthCheck()).resolves.toEqual({ ok: true });
      });

      const expiredCachedData = {
        lastFetchTime: 0, // Makes data expired
        poolDetails: { __type: 'Map', value: [] },
        stakePools: [
          {
            cost: { __type: 'bigint', value: '170000000' },
            hexId: '7d59eb08203e86f74d3011c7e967ed50fbd0954001eab1cb00b69422',
            id: 'pool104v7kzpq86r0wnfsz8r7jeld2raap92qq84trjcqk62zyh9akqt',
            margin: { denominator: 1, numerator: 0 },
            metadata: {
              hash: '06179016bb99292a607ffea0dd7deba50483fa19195a6ce02854805657195658',
              url: 'https://adaseal.eu/poolMetaData.json',
              ticker: 'SEAL',
              name: 'adaseal.eu',
              description:
                'Community pool - Dedicated HA cluster, server room, 0% margin. 10% of profits donated to seal sanctuaries and zoos.',
              homepage: 'https://adaseal.eu'
            },
            metrics: {
              blocksCreated: 687,
              delegators: 0,
              livePledge: { __type: 'bigint', value: '0' },
              saturation: 0.024_780_220_936_594_807,
              size: { active: 0, live: 0 },
              stake: {
                active: { __type: 'bigint', value: '1866533268449' },
                live: { __type: 'bigint', value: '2000000000000' } // Test value, different from the one in the mock
              },
              lastRos: 0,
              ros: 0
            },
            owners: [],
            pledge: { __type: 'bigint', value: '60000000000' },
            relays: [],
            rewardAccount: '',
            status: 'active',
            vrf: ''
          }
        ],
        stats: { qty: { activating: 0, active: 5, retired: 0, retiring: 1 } }
      };

      it('in case of expired cache data and error in asyncFetchData, StakePoolProvider works anyway even if with old data', async () => {
        extensionLocalStorageMock.get.mockResolvedValue({ [cacheKey]: expiredCachedData });
        nextBFCallThrows = true;

        const stakePoolProvider = init();

        const result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('2000000000000'));
      });

      it('in case of expired cache data and continuous error in asyncFetchData, StakePoolProvider continues to work', async () => {
        extensionLocalStorageMock.get.mockResolvedValue({ [cacheKey]: expiredCachedData });
        nextBFCallThrows = true;

        const stakePoolProvider = init();

        // Prevent next asyncFetchData call from recovering
        nextBFCallThrows = true;

        let result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('2000000000000'));

        // Give asyncFetchData a while to try to recover
        await new Promise((resolve) => setTimeout(resolve, 1));

        result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('2000000000000'));
      });

      it('asyncFetchData continues to try to recover', async () => {
        extensionLocalStorageMock.get.mockResolvedValue({ [cacheKey]: expiredCachedData });
        nextBFCallThrows = true;

        const stakePoolProvider = init();

        // Prevent next asyncFetchData call from recovering
        nextBFCallThrows = true;

        let result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('2000000000000'));

        // Give asyncFetchData a while to try to recover
        await new Promise((resolve) => setTimeout(resolve, 1));

        // This time asyncFetchData should recover
        result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('2000000000000'));

        // Give asyncFetchData a while to to recover
        await new Promise((resolve) => setTimeout(resolve, 1));

        result = await stakePoolProvider.queryStakePools({
          filters: { text: 'seal' },
          pagination: { startAt: 0, limit: 10 }
        });

        expect(result.totalResultCount).toBe(1);
        expect(result.pageResults[0].metrics?.stake.live).toBe(BigInt('1881463142839'));
      });
    });
  });
});
