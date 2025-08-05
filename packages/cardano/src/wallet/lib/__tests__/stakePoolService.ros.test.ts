// cSpell:ignore adaseal atada
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers, camelcase */
import { getCacheKey, initStakePoolService } from '../stakePoolService';
import { Cardano, NetworkInfoProvider, SupplySummary } from '@cardano-sdk/core';
import { BlockfrostClient } from '@cardano-sdk/cardano-services-client';
import { Storage } from 'webextension-polyfill';
import { fromSerializableObject } from '@cardano-sdk/util';

// cSpell:disable

/*
Test data was collected applying following diff to stakePoolService.ts.
The two objects dumped in the service worker console are respectively cachedData and details.
Last:
- cachedData.lastFetchTime must be set to Date.now() to avoid the test to try fetch new data.
- details includes the stake pool(s) the wallet used to dump the data delegates to: remove them.

--- a/packages/cardano/src/wallet/lib/stakePoolService.ts
+++ b/packages/cardano/src/wallet/lib/stakePoolService.ts
@@ -353,6 +353,8 @@ export const initStakePoolService = (props: StakePoolServiceProps): StakePoolPro
     return [...stakePools, ...(await nextPages)];
   };

+  const det: Record<Cardano.PoolId, { details: Responses['pool']; ros: number }> = {};
+
   /**
    * Fetches all the data required to make the _Browse pools_ page to work.
    * It also saves the data in the cache and builds the fuzzy index.
@@ -395,6 +397,56 @@ export const initStakePoolService = (props: StakePoolServiceProps): StakePoolPro
       saveData(data);
       cachedData = Promise.resolve(data);
       healthStatus = true;
+
+      const pools = new Set([
+        'pool19yzqr3meksnvzdxh5xf6aknfhldyqdj7eaquxgcjva4mzt5kg3v',
+        'pool1f2wfjqkf2wx6jq93pdck6hgmy9zgw32lmvrq9zejl7scqxjqfze',
+        'pool1nqheyct9a0mxn80cwp9pd5guncfu3rzwqtmru0l94accz7gjcgl',
+        'pool1ekcsyzwexl7p2kwxxh34hy28l6772vrmff7jwmuxsa6u6fzty9z',
+        'pool14cq4fchmmqjygwjw4zexmqqd6a7caxptjnvseyu6wanjuppv4vk',
+        'pool16ajaae2n5lsyr4f9k9uz5y8tpf0996tw640dzu7chwp2wdrnz6a',
+        'pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k',
+        'pool18ufrgfgmslekdxnk9v9345qvhrr7vfgzkvneqtwm7unnwaht6ww',
+        'pool16agnvfan65ypnswgg6rml52lqtcqe5guxltexkn82sqgj2crqtx',
+        'pool1lhz4gsk5ezdl5s4mv2kxgrkhzzhad6me2v0xmwuyt845vensdlc',
+        'pool1sskadl6p2w0ttfr60y2ssfzcmrnaty4wt68v5glzd3e5vwkh7z5',
+        'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am',
+        'pool1xt0gxs63r5vgjsrzhm7jfuhuqzga9pf8kqvp38qmdzn3wjxudvr',
+        'pool1rw29y8c5md2rm4ynkrqhpm9saatd0a0xzyyc6xudelgkww5junh',
+        'pool1pjmqlsyny06w0x60rfd3seul5xc9pluh3t08y55ylhks28jeh7c',
+        'pool12udshcl3ycj4qpxes28n0ugsye23h89rj8z2a5ast4482m08xe7',
+        'pool1wm89xjqp96t3mlun3pa5suxa3t4s5lluq239en0nxl7pcm5tprc',
+        'pool1rj6apcqxcvavaxp22f75zs9upphena7ntsnut2efvq98g4404up',
+        'pool1hezakp5r240dy4fcsm7mfd3qqahcvyrhj8hl770yxmxxzdwvcre',
+        'pool1a6ysvnx24xsjh2f6ehgmx7yu9q45fd7lsk88v2swxkek7pkxtgp',
+        'pool1522rtve5zlgnlh3zm5a4mcy3u7gpndg3kkac3xyzxmp6x6weca3',
+        'pool1gaztx97t53k47fr7282d70tje8323vvzx8pshgts30t9krw62tm'
+      ]);
+
+      // eslint-disable-next-line no-console
+      console.log(
+        toSerializableObject({
+          networkData,
+          lastFetchTime: Date.now(),
+          poolDetails: new Map(),
+          stakePools: stakePools.filter(({ id }) => pools.has(id)),
+          stats: { qty: { activating: 0, active, retired: 0, retiring: retiringPools.length } }
+        })
+      );
+
+      for (const pool of pools) {
+        // eslint-disable-next-line @typescript-eslint/no-use-before-define
+        const { pageResults } = await queryStakePools({
+          filters: { identifier: { values: [{ id: pool as Cardano.PoolId }] } },
+          pagination: { startAt: 0, limit: 1000 }
+        });
+
+        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
+        det[pool].ros = pageResults[0].metrics!.ros;
+      }
+
+      // eslint-disable-next-line no-console
+      console.log(det);
     } finally {
       fetchingData = false;
     }
@@ -435,6 +487,7 @@ export const initStakePoolService = (props: StakePoolServiceProps): StakePoolPro
           // If the pool is queried by id and details are not present in the cache, fetch them
           const details = await blockfrostClient.request<Responses['pool']>(`pools/${id}`);

+          det[id] = { details, ros: 0 };
           poolDetails.set(id, details);
           enrichStakePool({ details, networkData, id, stakePools });
           saveData(data);
*/

const cachedData = {
  networkData: {
    genesisParameters: {
      activeSlotsCoefficient: 0.05,
      epochLength: 432_000,
      maxKesEvolutions: 62,
      maxLovelaceSupply: {
        __type: 'bigint',
        value: '45000000000000000'
      },
      networkId: 1,
      networkMagic: 764_824_073,
      securityParameter: 2160,
      slotLength: 1,
      slotsPerKesPeriod: 129_600,
      systemStart: {
        __type: 'Date',
        value: 1_506_203_091_000
      },
      updateQuorum: 5
    },
    network: {
      supply: {
        max: '45000000000000000',
        total: '37986241880583689',
        circulating: '36481373468760696',
        locked: '374454623179004',
        treasury: '1814040155030734',
        reserves: '7013758119416311'
      },
      stake: {
        live: '21884607626497535',
        active: '21928035208025158'
      }
    },
    protocolParameters: {
      coinsPerUtxoByte: 4310,
      collateralPercentage: 150,
      committeeTermLimit: 0,
      costModels: {
        __type: 'Map',
        value: [
          [
            0,
            [
              100_788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59_957, 4, 1, 11_183, 32, 201_305, 8356, 4, 16_000, 100,
              16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 100, 100, 16_000, 100, 94_375, 32,
              132_994, 32, 61_462, 4, 72_010, 178, 0, 1, 22_151, 32, 91_189, 769, 4, 2, 85_848, 228_465, 122, 0, 1, 1,
              1000, 42_921, 4, 2, 24_548, 29_498, 38, 1, 898_148, 27_279, 1, 51_775, 558, 1, 39_184, 1000, 60_594, 1,
              141_895, 32, 83_150, 32, 15_299, 32, 76_049, 1, 13_169, 4, 22_100, 10, 28_999, 74, 1, 28_999, 74, 1,
              43_285, 552, 1, 44_749, 541, 1, 33_852, 32, 68_246, 32, 72_362, 32, 7243, 32, 7391, 32, 11_546, 32,
              85_848, 228_465, 122, 0, 1, 1, 90_434, 519, 0, 1, 74_433, 32, 85_848, 228_465, 122, 0, 1, 1, 85_848,
              228_465, 122, 0, 1, 1, 270_652, 22_588, 4, 1_457_325, 64_566, 4, 20_467, 1, 4, 0, 141_992, 32, 100_788,
              420, 1, 1, 81_663, 32, 59_498, 32, 20_142, 32, 24_588, 32, 20_744, 32, 25_933, 32, 24_623, 32, 53_384_111,
              14_333, 10
            ]
          ],
          [
            1,
            [
              100_788, 420, 1, 1, 1000, 173, 0, 1, 1000, 59_957, 4, 1, 11_183, 32, 201_305, 8356, 4, 16_000, 100,
              16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 16_000, 100, 100, 100, 16_000, 100, 94_375, 32,
              132_994, 32, 61_462, 4, 72_010, 178, 0, 1, 22_151, 32, 91_189, 769, 4, 2, 85_848, 228_465, 122, 0, 1, 1,
              1000, 42_921, 4, 2, 24_548, 29_498, 38, 1, 898_148, 27_279, 1, 51_775, 558, 1, 39_184, 1000, 60_594, 1,
              141_895, 32, 83_150, 32, 15_299, 32, 76_049, 1, 13_169, 4, 22_100, 10, 28_999, 74, 1, 28_999, 74, 1,
              43_285, 552, 1, 44_749, 541, 1, 33_852, 32, 68_246, 32, 72_362, 32, 7243, 32, 7391, 32, 11_546, 32,
              85_848, 228_465, 122, 0, 1, 1, 90_434, 519, 0, 1, 74_433, 32, 85_848, 228_465, 122, 0, 1, 1, 85_848,
              228_465, 122, 0, 1, 1, 955_506, 213_312, 0, 2, 270_652, 22_588, 4, 1_457_325, 64_566, 4, 20_467, 1, 4, 0,
              141_992, 32, 100_788, 420, 1, 1, 81_663, 32, 59_498, 32, 20_142, 32, 24_588, 32, 20_744, 32, 25_933, 32,
              24_623, 32, 43_053_543, 10, 53_384_111, 14_333, 10, 43_574_283, 26_308, 10
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
      maxExecutionUnitsPerBlock: {
        memory: 62_000_000,
        steps: 20_000_000_000
      },
      maxExecutionUnitsPerTransaction: {
        memory: 14_000_000,
        steps: 10_000_000_000
      },
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
      prices: {
        memory: 0.0577,
        steps: 0.000_072_1
      },
      protocolVersion: {
        major: 10,
        minor: 0
      },
      stakeKeyDeposit: 2_000_000,
      treasuryExpansion: '0.2'
    }
  },
  lastFetchTime: Date.now(),
  poolDetails: {
    __type: 'Map',
    value: []
  },
  stakePools: [
    {
      cost: {
        __type: 'bigint',
        value: '930000000'
      },
      hexId: '1cb5d0e006c33ace982a527d4140bc086f99f7d35c27c5ab29600a74',
      id: 'pool1rj6apcqxcvavaxp22f75zs9upphena7ntsnut2efvq98g4404up',
      margin: {
        denominator: 100,
        numerator: 1
      },
      metadata: {
        hash: '4c429f6a2734471425e7b44275e155660d4897fbe46846b0401b1e518c9f3302',
        url: 'https://adapointpool.com/metadata/poolmeta.json',
        ticker: 'APP',
        name: 'ADA Point Pool',
        description: 'Providing secure staking rewards for institutions and individuals.',
        homepage: 'https://adapointpool.com'
      },
      metrics: {
        blocksCreated: 5375,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.029_496_622_225_630_476,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '2280985466757'
          },
          live: {
            __type: 'bigint',
            value: '2240931653046'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '10000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '2500000000'
      },
      hexId: '76ce5348012e971dff93887b4870dd8aeb0a7ffc02a25ccdf337fc1c',
      id: 'pool1wm89xjqp96t3mlun3pa5suxa3t4s5lluq239en0nxl7pcm5tprc',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: '1a9d2e142cefc7af5fc834303155654e80591b63b38629e1aa01d7b5c55f7bd5',
        url: 'https://univocity.github.io/shopify/shopPool.json',
        ticker: 'SHOP',
        name: 'SHOP Pool',
        description:
          'Help us build cardano integrations with Shopify and other e-commerce platforms. Our open-source project will enable online shops and customers to exchange ADA for goods with 0 fees and commissions.',
        homepage: 'https://github.com/uniVocity/shopify'
      },
      metrics: {
        blocksCreated: 391,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.001_441_398_720_676_989_2,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '109506640900'
          },
          live: {
            __type: 'bigint',
            value: '109506640900'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '1000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: 'cdb10209d937fc1559c635e35b9147febde5307b4a7d276f868775cd',
      id: 'pool1ekcsyzwexl7p2kwxxh34hy28l6772vrmff7jwmuxsa6u6fzty9z',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: 'd57940eb6b129edcaf37cbea0a3e2a996030827c437605446efb95bf0d3af0b2',
        url: 'https://raw.githubusercontent.com/Bmtxs/md/refs/heads/sp/ao.json',
        ticker: 'ADALO',
        name: 'ADALovelacePool',
        description: 'Your First Choice For Staking | drep1jkdeccjwuun37e64l7zpjwe67xmsxmgpzkuhqtt0qjcrudkvfx2',
        homepage: 'https://adalovelacepool.com'
      },
      metrics: {
        blocksCreated: 22_657,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 1.001_564_257_809_264_5,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '75635773455941'
          },
          live: {
            __type: 'bigint',
            value: '76091324312180'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '1000000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: 'd7513627b3d50819c1c84687bfd15f02f00cd11c37d7935a67540089',
      id: 'pool16agnvfan65ypnswgg6rml52lqtcqe5guxltexkn82sqgj2crqtx',
      margin: {
        denominator: 100,
        numerator: 1
      },
      metadata: {
        hash: '5cb6bee37ab6c85474cf1ebe9811b85d5439910596eb285f826a02e19687966a',
        url: 'https://data.spirestaking.com/ADA/spire.json',
        ticker: 'SPIRE',
        name: 'Spire Staking | 🏆 Top 10 Operator',
        description: 'Professionally Operated Pool Supporting Cardano Growth and Decentralization',
        homepage: 'https://www.spirestaking.com'
      },
      metrics: {
        blocksCreated: 20_501,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.994_219_411_492_271_7,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '74711442110445'
          },
          live: {
            __type: 'bigint',
            value: '75533318094634'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '1500000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: 'ee89064ccaa9a12ba93acdd1b3789c282b44b7df858e762a0e35b36f',
      id: 'pool1a6ysvnx24xsjh2f6ehgmx7yu9q45fd7lsk88v2swxkek7pkxtgp',
      margin: {
        denominator: 2,
        numerator: 1
      },
      metadata: {
        hash: 'bb883dfd5e31d19d1ee3fd8be1d21f6e7b627e520aa26be5a4372209fb99ec3d',
        url: 'https://vivi7911.github.io/vivi/poolMetaData.json',
        ticker: 'VIVI',
        name: 'VIVI Pool',
        description: 'Cardano to the moon',
        homepage: 'https://vivi-stakepool.com/'
      },
      metrics: {
        blocksCreated: 3432,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.131_407_524_087_936_93,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '10005000606243'
          },
          live: {
            __type: 'bigint',
            value: '9983355989866'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '15000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '345000000'
      },
      hexId: '7ea4b5bf56a3a4106283a26c27e82875dddfc850d2abb9a79d3a6d70',
      id: 'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am',
      margin: {
        denominator: 50,
        numerator: 3
      },
      metadata: {
        hash: 'a55e601743ed047f1873052a3b88d321fb3fc4c0cd28852dbdb132ecaf9ede89',
        url: 'https://binance-ada.s3.us-east-2.amazonaws.com/binance_16.json',
        ticker: null,
        name: null,
        description: null,
        homepage: null
      },
      metrics: {
        blocksCreated: 652,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '0'
          },
          live: {
            __type: 'bigint',
            value: '0'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '0'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: 'fdc55442d4c89bfa42bb62ac640ed710afd6eb79531e6dbb8459eb46',
      id: 'pool1lhz4gsk5ezdl5s4mv2kxgrkhzzhad6me2v0xmwuyt845vensdlc',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: '6cb517a85db4238f864433245798166981e3a9fdf505d8a1412c2e95375f5e40',
        url: 'https://cardano.securestaking.io/secur2.241225-0922.json',
        ticker: 'SECUR',
        name: 'TWO SecureStaking.io',
        description:
          'We always have a 0% pool on offer. Check other SECUR pools if needed on our website or find us on Telegram. A team of cybersecurity specialists operate high security community pools in the cloud.',
        homepage: 'https://cardano.securestaking.io'
      },
      metrics: {
        blocksCreated: 18_372,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.991_385_745_717_558_2,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '75305749034869'
          },
          live: {
            __type: 'bigint',
            value: '75318037467580'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '100000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '842dd6ff41539eb5a47a7915082458d8e7d592ae5e8eca23e26c7346',
      id: 'pool1sskadl6p2w0ttfr60y2ssfzcmrnaty4wt68v5glzd3e5vwkh7z5',
      margin: {
        denominator: 1,
        numerator: 1
      },
      metadata: {
        hash: 'd822ec33f1ce055310bb75c19ceb489c359768c38c95163e83894fff4625e173',
        url: 'https://etoro-spo.github.io/ETO8.json',
        ticker: 'ETO8',
        name: 'eToro Pool 8',
        description:
          'eToro is the world’s leading social trading platform, which offers both investing in stocks and cryptocurrencies, as well as trading CFD with different underlying assets.',
        homepage: 'https://etoro.com'
      },
      metrics: {
        blocksCreated: 10_606,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '10314134659'
          },
          live: {
            __type: 'bigint',
            value: '0'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '0'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '35000000000'
      },
      hexId: '571b0be3f126255004d9828f37f11026551b9ca391c4aed3b05d6a75',
      id: 'pool12udshcl3ycj4qpxes28n0ugsye23h89rj8z2a5ast4482m08xe7',
      margin: {
        denominator: 10_000,
        numerator: 9999
      },
      metadata: {
        hash: '2c30be0232db0751287e9714636d2683ca783af60565516e061c3d073d0f309c',
        url: 'https://desayuno11.github.io/pool/meta.json',
        ticker: 'QQQ',
        name: 'QQQ',
        description: 'QQQ',
        homepage: 'https://github.com/desayuno11'
      },
      metrics: {
        blocksCreated: 8653,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.354_292_135_653_475_8,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '28415670651318'
          },
          live: {
            __type: 'bigint',
            value: '26916453522643'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '0'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: 'd765dee553a7e041d525b1782a10eb0a5e52e96ed55ed173d8bb82a7',
      id: 'pool16ajaae2n5lsyr4f9k9uz5y8tpf0996tw640dzu7chwp2wdrnz6a',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: 'd7c25ea70f63c45413d56c35a80293e7dd859233c43c25e1b0cad2738cdfc037',
        url: 'https://public.bladepool.com/metadata.json',
        ticker: 'BLADE',
        name: 'BLADE Pool',
        description: 'BLADE Pool - A Top 5 Cardano Stake Pool.',
        homepage: 'https://handle.me/blade'
      },
      metrics: {
        blocksCreated: 17_434,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.998_357_674_068_869_2,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '75218153393548'
          },
          live: {
            __type: 'bigint',
            value: '75847712181034'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '500000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '999999000000'
      },
      hexId: '1b94521f14db543dd493b0c170ecb0ef56d7f5e611098d1b8dcfd167',
      id: 'pool1rw29y8c5md2rm4ynkrqhpm9saatd0a0xzyyc6xudelgkww5junh',
      margin: {
        denominator: 100_000,
        numerator: 99_999
      },
      metadata: {
        hash: '1ef26488d3f9b16b3bd782f0e0d15540f4f74135555d5818a57b7df9a1d80d9e',
        url: 'https://git.io/JcA9e',
        ticker: 'RGDL',
        name: 'Ragdoll',
        description: 'Ragdoll',
        homepage: 'https://github.com/rgdl12345/rgdl12345'
      },
      metrics: {
        blocksCreated: 2635,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.131_968_351_795_991_65,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '10040483542608'
          },
          live: {
            __type: 'bigint',
            value: '10025963463809'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '0'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: 'ae0154e2fbd824443a4ea8b26d800dd77d8e982b94d90c939a77672e',
      id: 'pool14cq4fchmmqjygwjw4zexmqqd6a7caxptjnvseyu6wanjuppv4vk',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: '3c8bd45299dc9624e63bde15a3fdec4da1d2dada050027600c73a115b911c12b',
        url: 'https://chirkunov.github.io/ch2.json',
        ticker: 'CH1',
        name: 'Cardano Suisse',
        description: 'Swiss based and solar powered',
        homepage: 'http://cardanosuisse.com'
      },
      metrics: {
        blocksCreated: 5587,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 1.000_059_752_689_380_2,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '75439829764363'
          },
          live: {
            __type: 'bigint',
            value: '75977023321391'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '3000000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '345000000'
      },
      hexId: '32de8343511d18894062befd24f2fc0091d28527b018189c1b68a717',
      id: 'pool1xt0gxs63r5vgjsrzhm7jfuhuqzga9pf8kqvp38qmdzn3wjxudvr',
      margin: {
        denominator: 200,
        numerator: 3
      },
      metadata: {
        hash: '5165cffd0f6af942cfddaf34c3f88676e3de35944f54c56433c0465b20fdf96a',
        url: 'https://gavriel.cz/poolMetaData.json',
        ticker: null,
        name: null,
        description: null,
        homepage: null
      },
      metrics: {
        blocksCreated: 0,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 2.933_909_607_335_115e-8,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '2228964'
          },
          live: {
            __type: 'bigint',
            value: '2228964'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '1'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '78da8fa2f5089964963a0ab7ad1402e8c656f203bef622cf9f5ee3c6',
      id: 'pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k',
      margin: {
        denominator: 20,
        numerator: 1
      },
      metadata: {
        hash: '27e45ed4d7978d342b8fe9063466d0a22fec7c955f7566b6e33d3fc249d56a83',
        url: 'https://tinyurl.com/4fsrsmwj',
        ticker: 'KILN0',
        name: 'Kiln',
        description: 'Enterprise-grade staking made easy',
        homepage: 'https://kiln.fi'
      },
      metrics: {
        blocksCreated: 10_563,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.996_003_772_375_511_5,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '76310827409105'
          },
          live: {
            __type: 'bigint',
            value: '75668880422860'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '100000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: 'be45db0683555ed2553886fdb4b620076f86107791efff79e436cc61',
      id: 'pool1hezakp5r240dy4fcsm7mfd3qqahcvyrhj8hl770yxmxxzdwvcre',
      margin: {
        denominator: 10,
        numerator: 9
      },
      metadata: {
        hash: '6323ad39c5c6e6f79b75b0922527d1ea6ff3808d7447ef3e757ea4a553d7a4b9',
        url: 'https://hitoyasumi5115.github.io/hitoyasumiv2/poolMetaData.json',
        ticker: 'HIT',
        name: 'HIT Pool',
        description: '#カルダノ　ステークプール『HIT　 Pool』運営  ＃ADA ＃cardano #SPO',
        homepage: 'https://twitter.com/HIT40877568'
      },
      metrics: {
        blocksCreated: 650,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.050_982_830_698_340_25,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '3871506306523'
          },
          live: {
            __type: 'bigint',
            value: '3873292277328'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '500000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: '3f1234251b87f3669a762b0b1ad00cb8c7e62502b327902ddbf72737',
      id: 'pool18ufrgfgmslekdxnk9v9345qvhrr7vfgzkvneqtwm7unnwaht6ww',
      margin: {
        denominator: 1,
        numerator: 0
      },
      metadata: {
        hash: 'ab4605cfc369bb99ae0a95d5185d9c1d30e5ba67d1aae002e68049d3048bc4e4',
        url: 'https://ogampool.co.uk/poolmeta3.json',
        ticker: 'OGAM',
        name: 'Ogam Pool',
        description: 'Single pool operator based in the UK. Lowest fees, high pledge.',
        homepage: 'https://ogampool.co.uk/'
      },
      metrics: {
        blocksCreated: 5488,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.995_801_582_849_205_1,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '76021058672930'
          },
          live: {
            __type: 'bigint',
            value: '75653519582356'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '500000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '290401c779b426c134d7a193aeda69bfda40365ecf41c32312676bb1',
      id: 'pool19yzqr3meksnvzdxh5xf6aknfhldyqdj7eaquxgcjva4mzt5kg3v',
      margin: {
        denominator: 10,
        numerator: 1
      },
      metadata: {
        hash: '099322900d5698efa324b9fb1843b4c5f426ae8d3495a40cadf5a18aa7f73d78',
        url: 'https://figment.io/cardano/poolmeta.json',
        ticker: null,
        name: null,
        description: null,
        homepage: null
      },
      metrics: {
        blocksCreated: 6524,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 1.384_494_472_553_568_8,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '105194460438984'
          },
          live: {
            __type: 'bigint',
            value: '105183483833502'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '2000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '170000000'
      },
      hexId: '982f926165ebf6699df8704a16d11c9e13c88c4e02f63e3fe5af7181',
      id: 'pool1nqheyct9a0mxn80cwp9pd5guncfu3rzwqtmru0l94accz7gjcgl',
      margin: {
        denominator: 1,
        numerator: 1
      },
      metadata: {
        hash: '52ab9910bea96d6de25ab71506702c14483f548b696d601ed96f5da1407506db',
        url: 'https://mainnet.pool.cardano.services/metadata.json',
        ticker: 'CAG',
        name: 'Cardano AG Pool - Private',
        description: 'Private Stake Pool by Cardano AG',
        homepage: 'https://cardano.services'
      },
      metrics: {
        blocksCreated: 6312,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 1.031_821_298_648_976_5,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '64309639056606'
          },
          live: {
            __type: 'bigint',
            value: '78390026856036'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '60000000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '4744b317cba46d5f247e51d4df3d72c9e2a8b18231c30ba1708bd65b',
      id: 'pool1gaztx97t53k47fr7282d70tje8323vvzx8pshgts30t9krw62tm',
      margin: {
        denominator: 10,
        numerator: 1
      },
      metadata: {
        hash: 'f28658a23480b4034fb65e8638840b850c2f1b86cd8ab2baafbb98238faee5da',
        url: 'https://tinyurl.com/zbb82ahm',
        ticker: 'TW001',
        name: 'Trust Nodes',
        description: 'Trust Nodes (by Kiln)',
        homepage: 'https://trustwallet.com/'
      },
      metrics: {
        blocksCreated: 5602,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.755_923_913_792_331_6,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '56927344402533'
          },
          live: {
            __type: 'bigint',
            value: '57429417265266'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '100000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: 'a29435b33417d13fde22dd3b5de091e79019b511b5bb88988236c3a3',
      id: 'pool1522rtve5zlgnlh3zm5a4mcy3u7gpndg3kkac3xyzxmp6x6weca3',
      margin: {
        denominator: 4,
        numerator: 1
      },
      metadata: {
        hash: '4cc901a8c284ad5ff0c87322b15fa4ab148b0bbbeb20bac53d0c1e512e83d851',
        url: 'https://resortlife.github.io/aimemo/poolMetaData.json',
        ticker: '1112',
        name: 'KOG 01',
        description: 'My pool description',
        homepage: 'https://twitter.com/6iEtbL6FNLNnY1s'
      },
      metrics: {
        blocksCreated: 822,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.181_935_931_096_556_42,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '13818562866484'
          },
          live: {
            __type: 'bigint',
            value: '13822124570806'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '80000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '4a9c9902c9538da900b10b716d5d1b214487455fdb06028b32ffa180',
      id: 'pool1f2wfjqkf2wx6jq93pdck6hgmy9zgw32lmvrq9zejl7scqxjqfze',
      margin: {
        denominator: 50,
        numerator: 3
      },
      metadata: {
        hash: '25e884f4594f1996e80741b4ee48a0007c510368d3580ec4595c38e730a29b2a',
        url: 'https://pcpm.s3.amazonaws.com/LBF2/poolmeta.json',
        ticker: 'LBF2',
        name: 'Ledger by Figment 2',
        description: 'a cardano mainnet pool',
        homepage: 'https://www.ledger.com/coin/staking/cardano'
      },
      metrics: {
        blocksCreated: 5583,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 1.115_067_104_041_739_7,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '83602215213785'
          },
          live: {
            __type: 'bigint',
            value: '84714417454423'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '2000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '200000000000'
      },
      hexId: '0cb60fc09323f4e79b4f1a5b18679fa1b050ff978ade725284fded05',
      id: 'pool1pjmqlsyny06w0x60rfd3seul5xc9pluh3t08y55ylhks28jeh7c',
      margin: {
        denominator: 1000,
        numerator: 999
      },
      metadata: {
        hash: '7d7d2de3f179df94e47fd4cd5456d20a7b8093cf8533e8d619995917c75304b2',
        url: 'https://kaldanodx.github.io/poolMetaData/poolMetaData.json',
        ticker: 'RIZIN',
        name: 'RIZIN',
        description: 'None',
        homepage: 'https://'
      },
      metrics: {
        blocksCreated: 2488,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.324_899_978_157_338_07,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '24675409883046'
          },
          live: {
            __type: 'bigint',
            value: '24683458314562'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '10000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '0a156f7c3a768ecfb1a4c710a26391dd86b78aa959ba4aa0e2c5e47f',
      id: 'pool1pg2k7lp6w68vlvdycug2ycu3mkrt0z4ftxay4g8zchj87mw6ug8',
      margin: {
        denominator: 50,
        numerator: 1
      },
      metadata: {
        hash: 'f56dab21c341269b6930858223b683f09895e0ab585b744f6c4e5e384da18a2e',
        url: 'https://raw.githubusercontent.com/VJRAS/v/main/poolmeta.json',
        ticker: 'VJRAS',
        name: 'Love_over_Gold',
        description: '247 Uptime',
        homepage: 'http://75.119.134.23/index.html'
      },
      metrics: {
        blocksCreated: 193,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.000_013_222_653_211_648_44,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '1005175300'
          },
          live: {
            __type: 'bigint',
            value: '1005175300'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '1000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '345000000'
      },
      hexId: '3a0c080b10b148b7ca13161458d29a3516fc35e66e423d15cbe94775',
      id: 'pool18gxqszcsk9yt0jsnzc293556x5t0cd0xdepr69wta9rh23349j5',
      margin: {
        denominator: 20,
        numerator: 3
      },
      metadata: {
        hash: '4300f53b92bab9af1e2d04c5612be0402771322a76b1955955ea2212b3932ee8',
        url: 'https://raw.githubusercontent.com/joeloliver/ada/main/pMD.json',
        ticker: null,
        name: null,
        description: null,
        homepage: null
      },
      metrics: {
        blocksCreated: 0,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.000_066_018_362_421_107_98,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '5018662003'
          },
          live: {
            __type: 'bigint',
            value: '5018662003'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '5000000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    },
    {
      cost: {
        __type: 'bigint',
        value: '340000000'
      },
      hexId: '4413cf615dc6877ad1b33c75b26e054fc25291f918420c88ef9bb37b',
      id: 'pool1gsfu7c2ac6rh45dn836myms9flp99y0erppqez80nwehk9c70eu',
      margin: {
        denominator: 25,
        numerator: 1
      },
      metadata: {
        hash: 'ee5f23e05cd0408b3fff94808ac2772e9da10bfb926df001304d5d958c945e37',
        url: 'https://www.blockops.zone/spo-cardano/bzone.json',
        ticker: 'BZONE',
        name: 'Blockops Zone',
        description:
          'BZONE is a staking pool maintained by a group of individuals with the objective of raising resources to develop software and to promote the adoption of blockchain, especially Cardano. Please visit the website and stake with us to support the project.',
        homepage: 'https://www.blockops.zone'
      },
      metrics: {
        blocksCreated: 252,
        delegators: 0,
        livePledge: {
          __type: 'bigint',
          value: '0'
        },
        saturation: 0.000_006_585_808_520_620_812,
        size: {
          active: 0,
          live: 0
        },
        stake: {
          active: {
            __type: 'bigint',
            value: '500647786'
          },
          live: {
            __type: 'bigint',
            value: '500647786'
          }
        },
        lastRos: 0,
        ros: 0
      },
      owners: [],
      pledge: {
        __type: 'bigint',
        value: '500000000'
      },
      relays: [],
      rewardAccount: '',
      status: 'active',
      vrf: ''
    }
  ],
  stats: {
    qty: {
      activating: 0,
      active: 2986,
      retired: 0,
      retiring: 3
    }
  }
};

const details = {
  pool19yzqr3meksnvzdxh5xf6aknfhldyqdj7eaquxgcjva4mzt5kg3v: {
    details: {
      pool_id: 'pool19yzqr3meksnvzdxh5xf6aknfhldyqdj7eaquxgcjva4mzt5kg3v',
      hex: '290401c779b426c134d7a193aeda69bfda40365ecf41c32312676bb1',
      vrf_key: '302d6b70c7c914dadaeac8f0440ddea3fad562c688f157ea960052403525137b',
      blocks_minted: 6524,
      blocks_epoch: 13,
      live_stake: '105183483833502',
      live_size: 0.004_806_276_887_786_076,
      live_saturation: 1.384_494_472_553_568_8,
      live_delegators: 63,
      active_stake: '105194460438984',
      active_size: 0.004_797_258_826_020_365,
      declared_pledge: '2000000',
      live_pledge: '3446078',
      margin_cost: 0.1,
      fixed_cost: '340000000',
      reward_account: 'stake1uykw8dwsw4ul5sxdr0mxlpljetlxrehrztnpvmms79xa85gtxzypa',
      owners: ['stake1uxyl7kmd85hl7hyqz4havp6n2ynt9c2n7uraudt8n8fjp4g6mmt9h'],
      registration: ['1dee1a6d79b292105e61146d1079ddef8b72b0f9358bb850755548f3ec63795e'],
      retirement: [],
      calidus_key: null
    },
    ros: 0.020_206_105_363_176_13
  },
  pool1f2wfjqkf2wx6jq93pdck6hgmy9zgw32lmvrq9zejl7scqxjqfze: {
    details: {
      pool_id: 'pool1f2wfjqkf2wx6jq93pdck6hgmy9zgw32lmvrq9zejl7scqxjqfze',
      hex: '4a9c9902c9538da900b10b716d5d1b214487455fdb06028b32ffa180',
      vrf_key: '18dd29025d4dbf5899ff54da2ab4a0f25f49a0b04d339d64108aa55538a1d484',
      blocks_minted: 5583,
      blocks_epoch: 9,
      live_stake: '84714417454423',
      live_size: 0.003_870_958_936_081_272_7,
      live_saturation: 1.115_067_104_041_739_7,
      live_delegators: 10_878,
      active_stake: '83602215213785',
      active_size: 0.003_812_572_098_716_282,
      declared_pledge: '2000000',
      live_pledge: '9815889',
      margin_cost: 0.06,
      fixed_cost: '340000000',
      reward_account: 'stake1u8ah6l0g6unccujkufkwufjqstj8tv3639ftkykvk69a65s8h62ap',
      owners: ['stake1uxgm4h9atd0s457acgx85vnc0kamg68h8j2wtrzrgp7t5eqm9vydu'],
      registration: ['7c3103489d13e34cc0897c35b825284032603e8b931db589087ffbbe5b768f17'],
      retirement: [],
      calidus_key: null
    },
    ros: 0.026_280_556_891_642_88
  },
  pool1nqheyct9a0mxn80cwp9pd5guncfu3rzwqtmru0l94accz7gjcgl: {
    details: {
      pool_id: 'pool1nqheyct9a0mxn80cwp9pd5guncfu3rzwqtmru0l94accz7gjcgl',
      hex: '982f926165ebf6699df8704a16d11c9e13c88c4e02f63e3fe5af7181',
      vrf_key: '2425f46a329162872d409035d4a869dee75b42c36c991b737453de4b5b7d0991',
      blocks_minted: 6312,
      blocks_epoch: 8,
      live_stake: '78390026856036',
      live_size: 0.003_581_970_862_530_914,
      live_saturation: 1.031_821_298_648_976_5,
      live_delegators: 27,
      active_stake: '64309639056606',
      active_size: 0.002_932_758_838_013_455_2,
      declared_pledge: '60000000000000',
      live_pledge: '73107139184402',
      margin_cost: 1,
      fixed_cost: '170000000',
      reward_account: 'stake1ux0xd7hgmrglu5dcrl4alwz56z8p78cm6rgdhpfrsnltj6cla3w0p',
      owners: ['stake1ux0xd7hgmrglu5dcrl4alwz56z8p78cm6rgdhpfrsnltj6cla3w0p'],
      registration: [
        'f0da6ab17e3c862c0d5ff00935aeab19c1f8e908b2f39affc9019ec21ad55073',
        'bd4e7cc478d472fd4b8165a5b811bcc74f61615d1f6b9acfd3b5ff7d6dd35a06'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool1ekcsyzwexl7p2kwxxh34hy28l6772vrmff7jwmuxsa6u6fzty9z: {
    details: {
      pool_id: 'pool1ekcsyzwexl7p2kwxxh34hy28l6772vrmff7jwmuxsa6u6fzty9z',
      hex: 'cdb10209d937fc1559c635e35b9147febde5307b4a7d276f868775cd',
      vrf_key: '5b5eddaf4316c3a1e64ba6412d0528e2c1a56cc02e0c4f7741e35eddb4dc75a0',
      blocks_minted: 22_657,
      blocks_epoch: 12,
      live_stake: '76091324312180',
      live_size: 0.003_476_933_450_707_603,
      live_saturation: 1.001_564_257_809_264_5,
      live_delegators: 5199,
      active_stake: '75635773455941',
      active_size: 0.003_449_272_711_321_625_5,
      declared_pledge: '1000000000000',
      live_pledge: '1000885465046',
      margin_cost: 0,
      fixed_cost: '170000000',
      reward_account: 'stake1uxgas73meade07pue97zp4cz92fumj2rkz6jt7pv40npfmcn7geen',
      owners: [
        'stake1uxgas73meade07pue97zp4cz92fumj2rkz6jt7pv40npfmcn7geen',
        'stake1u8g5sws67pjkx0y3duxe57teg6ag3p2cns08taheucql0pcpq45f5'
      ],
      registration: [
        '37e06de658f810bca747c10b6c82b1cc0d12ca23ede88fb4d9079eb01fe02cc0',
        'fb5c090e64bc3308a24474a4ca93eb4b6edca0f0eafa652c586a7d258f2a7a6e',
        '23a7376aef5f310875245f6603da36ff6fc8687cc1c7acd8a7e4be780e3d270a',
        'd417190e14275517abca3afaee3419ca7094051aa1ab9748d27a46f42d1e46a1',
        '1e131f2d48993f577a4152f4906adc3c82f20c5b430a226e8324639582337374',
        'a78a8ffb71605b235acc9252ea1e262f3898b8941f512e7d644b99ce320d5a4c',
        '61faf56c6a6a5bea7909ee7bfe01dcd5e9520b7d35af4a277caec70e2e34cd7b',
        '974f6667e03ff02a8c56772f90a57fad26188295b9aa8f7eaa03c4378764fef3',
        '6e50af9e413f3dc45b5714f4cc6d4a8d3b94b49ee577740f474c2b0603ece6df',
        '21d4bf8c2d0247143f4faf76e02cd74bcdfb506289e622910b431ab3ce6e7f09',
        '5303342572274049f71b78ff38e97e04ec27b9b677f57101befbce6401437585',
        '4cf5375c3cdd55033c41c55be9bc1c5da727d420bebc198a52ef0bcfe7952029',
        'fee3304695e68e7af7383d9dcb2cfe7d92e9e315a497077257a9423d3175b0aa',
        'c1618ac3cfd91e705b8730933e0b82f644ea0bd4addb789ea2dc58d978248ac8',
        '7feef530cb0c42d3c9954a427433bad9e519cd757c186292c04ee0f2c2d1183e',
        'd1bbd8b5848d0a334e69c6c1ade2f2f0c41ebefd972b970e2aed5b10d8050102',
        'b0150a0d15c9a1eb2a2d026cb876c1b8f04f0df6e935567ab9bb98eb77d6ecde',
        'f8e3aeea3891fd1e129834f615f58812cb58e0fd079415c799e82d2f8608f0b6',
        '4cea9e19e3748f957e2498a386a13cd28ec4fde24bda4c9b3131ea5453f9464b',
        'f8776c6dceb59607957834dde0267e4cefe4f4214c65e97739a8fa29ec4733c6',
        '86782b024212119f5bd4e03821920eca1fc57e80e0cf701369b336b866a63f93',
        'ef79972ee69c4032e4b84d2952d630afc95fcc42f6ad57a098e2702ed4898284',
        'f42a671cfa129a85e3539b82daea296c718f3af508e439f165d981de4dcce468',
        '9b42372d1cbeb7684c52e76d7deb166d139ed5cab1df26adc60f84d304ccbfda',
        '5ca3219cc207938a4c1c52a035d4dae1146316906a4a55253ee5514fbbe5b7dc',
        '8a0aefbe19fc3e8d6cd6f30cd0097bebe94ddb188d2a6562c10cc4e91f8cbb7e',
        '2dd82ac5106b62a8659ba8ce6c352f9b0830f37153c528066c1ea5505a590726',
        'df3eabe2723ff8a39d6f48fa7a7f6a5c9061e70d5c73d2097d980c2d2f038045',
        'c9d7d0d77caea4282f201d0d1983938d3501da7b59d6cd67a46ea5c53d76f15b',
        '8c46e59afea167f417b1455e58187ac2eee929ecdd687deb8a33348fce9c099f',
        'd4b866e5e1bc87a84170d5a3bb3e46f01d60cdaf8ea4aacf447d18697a5f7139',
        '7bfdc6f83357c3f01a73a79ff045e26dbafe1f5a6a9029712b305cd0ae42ccd6',
        'd41b15b27f2259c407927cc94af093403970d96d12b073a3f12c30b6f69d9256',
        '0c20de8cdbd0a7831cace3c7ea9d5f528f3609e8f2d4b7b805f304f43046c024',
        '7399721d8a7ae69ed10d56ee2090f1b16e233a7643a1bdb813f22efb42ffca3a',
        '34b60dc6f634559a52797aed2d8fdf765d9e8e7fadfd7665618b2aa41eda482b',
        '0bd84e225c46cca738f1415fcb080f8fa9b4e9500f2a446ab56701a9c9fa617b',
        '9ea0693d09e5f3a80dd7c5ae0b0f810d368d21aece252402ff900e357f709f94',
        '735a167eda25fbbb8ae15a88208c6aba8c44cbcd5eb932bc330ffb3e82a81d6c',
        'a2bd6e1d0520e5f4cb640770cdfb93e5bffb941afdefe5b8a7d46ff60ce3e8bf',
        '9bce6df6d8abe95e467bc19111ea07f7c9c2c71f029c70bff02f886daca50dfd',
        'df0d8e26d822333839ae54e2485ae327679b587a313420a6e03db412f033a1e3',
        '1010e158419b0cc4806d1ccd73abd5b8bad768c72110f5966adc9103c27b3bc7',
        '322f62db68ee9c2d396d5ec2a37464c2038bf3a4c8ec16603b2331085514ca1c',
        'ee38dd9c9f9d913b2d539e166ea4ed31895ec43506d463f88630831e82aeb47c',
        '7e4246fd43f9dd961412076ac15d43e08f4ebad457d9f21b377e95fe0dfe8679',
        'bef3a87c05eb92e6b9007a78b6a51c3cfa7464965c1c6b71caba04de67d1e9dd',
        '2632a257beb191fa45592c863857c2c02d8f3ac1e4553291b3182aa26f3eea39',
        'cb77680aec69b7b3346f86233bc3e51379b6672772fc3067b12ab399c21e7e3f',
        'bd848bca56af8b38240c3d3a85bd9de01c6a315f98b6dffd73253e74dc2394b0',
        'b2d07a850a4ce70a1ee17eac9fc209e735c9e1449d47241e8dea367f9aaacb9c',
        '1ba2be671d10f28b2ab8f6c5cb8797b75176a31f9f6e37eb147402d8d0348aed',
        '656c5674a2a7dccb27e3d0536db2d14181224392c09342ecfbfc5709466fccaa',
        '8510ce26f66230d6b7c5d2f860661fb22c5c3d5d4514dc0833834770bc36e41d',
        '4fb9fbf015edc80001ddbdde4ccae88c0fc3ef080cd3d7916997c7f6f6d2887d',
        '7df1a36c038d3f63409f9d628a00d8b0421f4838c843010962f1bafc45738960',
        '9f2c6ddb41fe12714c74b9e777f23b6ec638fc222dcc58889542dbba52641ead',
        '8311cee720fbf22e831225d573d5c6f39a9ea6df1a8cb86e73ceafa673b25a38',
        '1fb119ef46514f3b7b18f9ac6bd35e4360b9ccc22f242202a5ac8d4e10fa9908',
        '58119a7207ab9b9f08a397b3ae179ad682e27ea902ba1622c096742ae9eedd84',
        '7d1f8c2d709dcb6e938d8eb6fe4542444cf18aac1ba9fc0d6758b111edfebc6d',
        '2a3f0199ccd188d5d88c26b5b3de4c5f255b5511e375604263e53df8022ed9c2',
        '5b95e1be2897e235e70b7404dbb185a3e670ced989308c1263d278532666ec10',
        'c6b8db28f5125d7e8dcc4fdcf9b4cdefeae349bbd94f60cbe144006792c74693',
        '53e86c883fea3545c57c724abd1d22ea58613579fb32c06479f986175fb38144',
        '18a6948bdbdf88fc9e9593476828349ffc103152693fca92eda1d5149041c99f',
        'c75a64584399820d728846a3140206d816ceff2b7300db5e557b325e58e7a57a',
        'e02ceeb437aa9c9c1a048b5d9d3a6190e62df661ff6c752f94978e44843a856b',
        '41d80cc8b11262f5e75a6e26035b0707d4e241d78df5d72f4c41f04d6616d57e',
        'c00f6ab1fba7d0f0c07f6dc06eafe21ebc20378aac69a5de0a8839883448378d',
        '6d8c3aa61521bd32fbce2ece4485e2191048a090d4b006297161208dfd5cc1bd',
        'e47d6d77f932d02ca6b298fbb5fec3bc916d8b87203af5454fce0027889538c1',
        '7e5af609a957f3ca18af331604cac2b7aa76b4ca97c368f2fe26f9f0c8e3c7bc',
        '05c9f1fe946a6962076130a151c89d1ea46746621c9151339e5802cc9c66bdc2',
        '6bb738fcc11fb1eb10e51251c336b5763b0876a19057ceda22425299221a6482',
        '291eec8320b0a62bc19dfce68f555ea00d86bf3548a703346cdafaf7150cdb28',
        '035cb92d7308aabb06aff31ea9c5d45bb4d985b0f338b03efd1c3bd3594f98a9',
        '3c14904706e4f8a1e556e02b050ce78aeffb948622852b36b74d4ad30f694ffa',
        '2da1e870a01a2ded20a2d7f34dd232700c2b99d0f027dc6587e5bc5673011d42',
        '0b9964027df992b3891c1f5131ee140c1750c86821c4135d3f459dcec4c434b6',
        '5f117aa9341efb562c973089402c05576f5e007b583aa4675b9e98e2fc0718cf',
        'a50ba861b8a2ac74c603228aa0ce3a88837fbe39e45548ffbde4d894e6164cd9',
        '3d52123045df38cb74732b9773d4346c2cae2f48a1c0e208b564ca0530428708',
        '2fc9f4a8bc2359420bd81456238896019e2e3e6cbe9939df341783daeb0711ac',
        '747b394a7d1176b8d26e14683705c62dfd4cd3f9352076892bfce23b6cedd2ad',
        '6d33c8fc5814330d16c6e17090928445816bd96b9e0895728dbfa68c1b5f431d',
        '0552fbb646777a2bc6edb1bce96d0cefdb314fc0fd8ea8b778b8a5aa5e6a746f',
        'f1cbe8de4640c8558202fb0e7b8167b23310391d64ba8be0c929e1ffa56cd65b',
        '1cb83583c8a7c4541d41483b61da214c228659e67edb36e829ea27999768734d',
        'e09d5d950f3c02fc89f9a82b166cd0cf2a9d628d8f8e9aae9923a25e5e4817ad',
        'a94d22a98bb74dabb9b69c29ab6b9470a920da4f5cc07ff20acbb1a64cb249ec',
        '1fdbaf3a995f82a554ebdd370760999d8eb95b8a5213e71994a9f6ad7ad318e9',
        '68582fe98d7d198e9375b01d1ae36eaaeac6cc749771dde14e4aaef248e5114e',
        '68dc5ea4c78a1cd7322507b05b8428e783a31bf9b5362e9c4a875659dfaca0d2',
        '5da95aeb94c3dc1a362e4c5a758380dc0f5e809678f871300e352d0951c64dc4',
        'c8225c85cae6ef43a0bbdf51cb4d8ce1715583de70405022ed82f394bc4eeb25'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.031_588_033_384_080_116
  },
  pool14cq4fchmmqjygwjw4zexmqqd6a7caxptjnvseyu6wanjuppv4vk: {
    details: {
      pool_id: 'pool14cq4fchmmqjygwjw4zexmqqd6a7caxptjnvseyu6wanjuppv4vk',
      hex: 'ae0154e2fbd824443a4ea8b26d800dd77d8e982b94d90c939a77672e',
      vrf_key: '3d4472c579a4d9388ab0a93e9909efb0a5f00af86ca04f5eb9c79ffa665408f9',
      blocks_minted: 5587,
      blocks_epoch: 11,
      live_stake: '75977023321391',
      live_size: 0.003_471_710_556_482_595,
      live_saturation: 1.000_059_752_689_380_2,
      live_delegators: 2017,
      active_stake: '75439829764363',
      active_size: 0.003_440_336_949_876_556,
      declared_pledge: '3000000000000',
      live_pledge: '4993339593658',
      margin_cost: 0,
      fixed_cost: '170000000',
      reward_account: 'stake1u8gunnstww7rufm4k8jsnwgg4r0y4f2hj52d964hl4v7vucuycwzx',
      owners: [
        'stake1uy4ull9qeazqllqw45ychn00z0y4v2vc6y90gun8lk9waug7sqete',
        'stake1u9qy3jjnm5jwrc0q29sk5gxtw9zh3zffl4zr7v4q4keyhlqzlr0wl',
        'stake1u8gunnstww7rufm4k8jsnwgg4r0y4f2hj52d964hl4v7vucuycwzx',
        'stake1u8vvxlwjg54d0g6cffg5rank07es0d3rfgyelm7rfyq3uyq7ln9ur'
      ],
      registration: [
        '904d3119d6b49950e8fff62885f79da1fe93640edb991893f74ff509a8387b38',
        '11eb1acaaf883e4ae15224f743bbfd9288b41f2f8a40ccb9559bd20712ae2f2c',
        'bff96bdc61e4723667adecc259153786bb6b5facf8ff85f7016f916f25ce6665',
        'a363805a87d06f0ac2d252eeb02d729deb39373fbf6a37c3b5ad142e3f83ba69',
        '4af307df58f2d855b5b41944c6a9bd0607a92e31715a70d80ba37b7f89c1cb12',
        '59d7ce430c49ca801218a6020430c4d9df98bc05a35aa5561f040af12e52dede',
        'c542da960ec188aab13402a32d5e0cd911fa81673753c47b858b8663a49f17fc',
        'ecd0ca0012b19fc42e5c8d6b3a76f02a3703bae9e2b60817394f35d6a4647d24',
        '6cfa24683d51c5c232199f5537e9530fe3f8519ba9cf6461974fbf7f84ad0303',
        '89faa9fa8a4a711fc2156b3af12b735df6c7eeb87a3a67915c91ce95c6ad4d9b',
        'd7141d1971da08a4727b6943e91e0125033e795a8c59915424173ee3b4026ef3',
        '6294820dabaa02461f2baa540d08e70fc3b4572f153c0929bb5bc44a20efa3f1',
        'dbdb61eca9c5e65851afd3778b100926fa2111095ead122386eca9d2a281f157',
        'cc6b443d5903f66b5070b293f6456d3362d0e089499beacd98454807985d4e0c'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.032_514_330_508_591_316
  },
  pool16ajaae2n5lsyr4f9k9uz5y8tpf0996tw640dzu7chwp2wdrnz6a: {
    details: {
      pool_id: 'pool16ajaae2n5lsyr4f9k9uz5y8tpf0996tw640dzu7chwp2wdrnz6a',
      hex: 'd765dee553a7e041d525b1782a10eb0a5e52e96ed55ed173d8bb82a7',
      vrf_key: 'ab490a95e22024debcb762c0e1a43063ff3338db8d031400988c34aae745fc53',
      blocks_minted: 17_434,
      blocks_epoch: 4,
      live_stake: '75847712181034',
      live_size: 0.003_465_801_785_232_777,
      live_saturation: 0.998_357_674_068_869_2,
      live_delegators: 5268,
      active_stake: '75218153393548',
      active_size: 0.003_430_227_682_506_633_3,
      declared_pledge: '500000000000',
      live_pledge: '553220824867',
      margin_cost: 0,
      fixed_cost: '170000000',
      reward_account: 'stake1uy00vzm77fnygza838phkjg4p8yh2hz5uaqfmhx3mh4q45sdx30d3',
      owners: ['stake1uy00vzm77fnygza838phkjg4p8yh2hz5uaqfmhx3mh4q45sdx30d3'],
      registration: [
        'cf421edca441d63262b0f6ab204439b735ae2bde33f7e30b693c95ddf908e355',
        '3cd60eb24bfd26f9224664f5c6960f21d2bb1537481ff5e081242c33178b4bfe',
        '244c1b3c09c8f7d038bb71b624486099587f9d82cc3f9671668e2fb5a88d0dad',
        'd0789e79398f5d72b6ef9452c9c5fd1790bf410577ffb2eaad24827c61bdfef3',
        '0542936fe8a1b058bee6f0302cc45dc2a774682e1e638d8e104d8e68642c6ab7',
        '227eacabb8ae543537f04e98b50f1750c018875d9c2405f1574ef80215376164',
        '1c8dad42fac844891c86bfebecc9bdf3c8dcc6b85ab2e1ab18c9622d1299fe92',
        'e091ebc09c1b521ce0e5a38f5d79d566973577d63c3dbb914013d9d83dd806ab',
        '28e9ba96cd363e2a9f08f9b70092c854d4b2e4e80dc947b101b94822f2050ac3',
        '5a705f307178636f1561ef53606b893030d452724592453409e6edb3a56c0d1a',
        '1d33a718330916199d632ff0371aae9c24e19eeb82d242f8b3dcc0373418404a',
        '68fa4dda0c8e47e534d6bcf1d86970e283784e09e8bdae6fc18aa799d5bbf673',
        '5f792b92c8c82ee95c083d300f86e2c85630cccbbac5d23fa8add9f06903b970',
        '1fc4abcf64524dc4007e6d3a6e1e6931a1298b8c2a8f7135f6cad897362ea21e',
        '4c504ddba796cd627b892e0a7bb6361c41ef11d8fa7a539d9a27780343cca6c8',
        '0f825aaefbf9c42356abddb9ac0c86f864f4685728af24be8ade0fd73c4e7142'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.031_592_478_767_300_536
  },
  pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k: {
    details: {
      pool_id: 'pool10rdglgh4pzvkf936p2m669qzarr9dusrhmmz9nultm3uvq4eh5k',
      hex: '78da8fa2f5089964963a0ab7ad1402e8c656f203bef622cf9f5ee3c6',
      vrf_key: '6910cb48c1a19ea80e8a20125342b1c13eee71d9d050e4e547ad9a146e0f6881',
      blocks_minted: 10_563,
      blocks_epoch: 12,
      live_stake: '75668880422860',
      live_size: 0.003_457_630_208_148_732,
      live_saturation: 0.996_003_772_375_511_5,
      live_delegators: 77,
      active_stake: '76310827409105',
      active_size: 0.003_480_057_683_470_746_5,
      declared_pledge: '100000000',
      live_pledge: '8110731801',
      margin_cost: 0.05,
      fixed_cost: '340000000',
      reward_account: 'stake1u902tef9c470lzajmlcsmgffyrtywgtj8wm30hr4gpff7tsnf56p4',
      owners: ['stake1u902tef9c470lzajmlcsmgffyrtywgtj8wm30hr4gpff7tsnf56p4'],
      registration: [
        '8a3398c199cc560a96232141c3d4e9efd401ef9bb2cfe8648f2ae7b628b51107',
        '37ef41ca1b0a99dc6d08b245dad99352753f8b38e8682215861529efe48dd39b',
        '2ef950e91e260456f9650ac3635232eb5c5fb50d0e209b9b7a62598d82f25bc9',
        '15d191c0eaa5849b459f7fc87451abf4907da302f76b427d18de15926c419a63',
        '24cc6c071ff99c136f0bd290a63808ef99b9902ebf59d8592eb95358d22c1cd9',
        '6ab09021a265de58810d810ce71e410904c864c357c19c68fa66c649c119aabe',
        'ee6b3f0eff12cdba5e0e50b8d309b5701cc71b309a7fbdf8f31f7411e3649430',
        '340af39ba90540e352d88ebebaa1562dad083d6140593133bea1c31bd2ac0835',
        'f1ebcd67ce8e1f7491c70d10aff5b6891c545ef0c75c5d1fb65d3ba5fc502d20',
        '54d5b745772a442069dd9dbb1d9961f2d9570f41ed79e9530c796bc7e124060c'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.029_787_129_228_867_17
  },
  pool18ufrgfgmslekdxnk9v9345qvhrr7vfgzkvneqtwm7unnwaht6ww: {
    details: {
      pool_id: 'pool18ufrgfgmslekdxnk9v9345qvhrr7vfgzkvneqtwm7unnwaht6ww',
      hex: '3f1234251b87f3669a762b0b1ad00cb8c7e62502b327902ddbf72737',
      vrf_key: 'fbbb1fc9ded4baeb9275da17b814c4434d740551ec95960ca8cbb5a2cae47931',
      blocks_minted: 5488,
      blocks_epoch: 8,
      live_stake: '75653519582356',
      live_size: 0.003_456_928_306_576_35,
      live_saturation: 0.995_801_582_849_205_1,
      live_delegators: 274,
      active_stake: '76021058672930',
      active_size: 0.003_466_843_150_867_800_3,
      declared_pledge: '500000000000',
      live_pledge: '515841681049',
      margin_cost: 0,
      fixed_cost: '170000000',
      reward_account: 'stake1u8jy3d6j7yjv2qhxu7aq20dwh98c2fxh42fx2s5ganm3sccl7gcqd',
      owners: [
        'stake1u9q3hxfrsw9ecnfjjclplwhf5vn8r8w8gptr6lr68dl359c9u9zpd',
        'stake1u8jy3d6j7yjv2qhxu7aq20dwh98c2fxh42fx2s5ganm3sccl7gcqd'
      ],
      registration: [
        '55e88571a97383ac9085bd0914c642f0a24e572738ae271fd5005e26c5df0548',
        '9bc41d53fac4bfd0925994823c14b49159e6f36856654b8f937cd8fae2427be1',
        'c36175352aa9b4aa910f35758dd99da1331d91e9798c3c033bc44dfe1f36fc29',
        '25957e8062bbcba7d6fb7b9f6d339f931e4696529698249b4a0b5f2cf66adf5c',
        'd7925716ccfcde9c1152e5a0783af872359774c5d15e2c41f723c87156461489',
        'eb9991154cbbc0f5669980d3cfb04b8932005b3f7eaa7fd2ea06048f94143f89',
        '891a3bbf770bfeaad89996bdd44c1e63d7a20a8c66ff208d1db8842ecca9d525',
        'df8f526ee62d9a17c1c8203bbf2d478a76ac28662d5244a92f6a0d76785ac5de',
        'b2430ee083376f8e4b758cbb36164a34161b95bda456138a90d561c85336df18',
        'e58b29c837012759195304f21e184ef9a22366f9376b0755aec9ef767e96825d',
        '2a9b4291d5f978cdac715974129383e35ae932b92d1904e8f623eb4c36d5592c',
        '268c17b699c33c9c9a3b1cc2960f35ad0bf8c52f29f44c170c1a1d5a861ab9e7',
        '068612c942f0500bfc65697ad4513dc25b929887ae26f86b7e9a7328b1cbf4de',
        '41774978dbd45a049c5cae0b7115d810fd44cc02073a450515ddc87513e3be08',
        '57d0647e32e5133d7f000e404c9fbfe823db8dc3eb51140b7dc0ed95994860b4',
        'f26763e5c311360cba0fcbb27399042579033e050f54db1c3800cb60fa9b0625',
        '0bb706a31e063bf82e1e4254febc4725f1b8e897d4462a72f5c8ce0f04efd291',
        'e362233d8334a843cc035d5ff96ef79a4686bd2a05f0dadee5db9a669e2be8d6',
        '6284afc4b1a2a5add9944ef6e00481cd740742ffbddd0cf04bfdd40a68c38e4a',
        '00e344113706226ab6d900f306813b17312800f18b61b85c5ddc33447df8fc47',
        '11fbeac1c89d63a2edd1a96a7e8b652a84c655a452d7facd50e906cd93eeff13'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.031_666_573_173_462_44
  },
  pool16agnvfan65ypnswgg6rml52lqtcqe5guxltexkn82sqgj2crqtx: {
    details: {
      pool_id: 'pool16agnvfan65ypnswgg6rml52lqtcqe5guxltexkn82sqgj2crqtx',
      hex: 'd7513627b3d50819c1c84687bfd15f02f00cd11c37d7935a67540089',
      vrf_key: 'a28f252093ae278d0d6a7c4969f80c47cc5b871a2d97c357588ab3df8633525e',
      blocks_minted: 20_501,
      blocks_epoch: 9,
      live_stake: '75533318094634',
      live_size: 0.003_451_435_793_766_732,
      live_saturation: 0.994_219_411_492_271_7,
      live_delegators: 9343,
      active_stake: '74711442110445',
      active_size: 0.003_407_119_762_517_634_2,
      declared_pledge: '1500000000000',
      live_pledge: '1507445618242',
      margin_cost: 0.01,
      fixed_cost: '340000000',
      reward_account: 'stake1uy0tpyye75e9schey3pfdu9kn06k7ysj6w04f53q98sf8vsqhl7f5',
      owners: ['stake1uy0tpyye75e9schey3pfdu9kn06k7ysj6w04f53q98sf8vsqhl7f5'],
      registration: [
        '464b810407b7ad3d71b256f6d265eea9035748d7ce540b3e09ce34841110d828',
        '6e8e44b724eb7cdf8e1f4a40826653bb6205036707a8357c3888aa0b724ed778',
        '74a484cab6fa06e76a11a740c9cc9bf09e627872ecf9bab4a7e74b940d09fd5e',
        'c195b0d0bf8f1cfb9aaf66e7f964aa76d2ba8405d0744baa6e1a601a030b4fa1',
        'ce5f57264a9165859e56ed07bb66777222c75bc053ebc7f6998dcc952dbc6843',
        'e8b0ba54e3978cf0712df55e255bae5cff19b074db407ab0cd9ef3378cddf563',
        'be444375d39d91efb3238d318b05162662cf45e21b6486601dfa7a58e44098cd',
        '45460f823713df6158aea8f9e95c110563b68f25b1eb783feb15f6bc7c7a4933',
        'd140a952eb937dcd8ba7e80715272c245e562448fc28f24e7de6db5c3d1137f3',
        '96af2fede195ecaef02f9d5fb1c64fd3660fd3eb1a3bc837d91ffda56a1ed6ac',
        '33a3772597b30ce7a7383b7ea63f4690fc35626bfba647aaee1d9d8d317b55cf',
        '688daea5de15ca45247b87d559d89d23d3966cd8e10220b664700878d873ea7d',
        '5ff092f2b51cbd3c3f5d972e4b2bd4987564cb06f3db1b3f865502ddcc56cf1a',
        '6e5c44fc5be9f10bdcceb2021234f370f3b54472495fa1c2147cbdea9d314649',
        'c553d2360a1791ec83d1c2ca289a862867b42efb7e9671305a66c49eaed0ec21',
        '66506083de6df38d6d6e431f4d97715ed98d0641a50b66f960ea28f658c1e14d',
        '871051460e0813fb697a8365fd01fe404c8f633e40c549abfd13a54b70875377'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.031_445_045_009_323_1
  },
  pool1lhz4gsk5ezdl5s4mv2kxgrkhzzhad6me2v0xmwuyt845vensdlc: {
    details: {
      pool_id: 'pool1lhz4gsk5ezdl5s4mv2kxgrkhzzhad6me2v0xmwuyt845vensdlc',
      hex: 'fdc55442d4c89bfa42bb62ac640ed710afd6eb79531e6dbb8459eb46',
      vrf_key: '5788246159aff5144954dacc85a842a74ba44d586fc5c3579e47be5a69ec8f1c',
      blocks_minted: 18_372,
      blocks_epoch: 7,
      live_stake: '75318037467580',
      live_size: 0.003_441_598_714_175_077,
      live_saturation: 0.991_385_745_717_558_2,
      live_delegators: 2853,
      active_stake: '75305749034869',
      active_size: 0.003_434_222_369_695_430_7,
      declared_pledge: '100000000000',
      live_pledge: '200837414004',
      margin_cost: 0,
      fixed_cost: '170000000',
      reward_account: 'stake1u9fxvt76exfznw8edqh50sknhgvp7vl8ndpf52sg6r656zg4czyq5',
      owners: [
        'stake1uyqp66zs78ce87t4jqxxdqas5mxc784fzenjgy5dp7ktfwqvf3c9r',
        'stake1uxsxpfw5ftwz242cegadvhu08uw3j9grxqzcaqj3x0v0tssz8ehvu'
      ],
      registration: [
        '797ca80e9183627484b29bf11049fd2b4d1f33657ca95e3ec294e7aa5a299451',
        'a5cf6732aa195f69f9b2f9c7e3d7a7dab93d55a8166f1c99ceb008d60e2a2b76',
        '1a73fc13d7f745ca616b76e107223ddec0f3efce2f81c8798ca0017e09882cb0',
        'baa11130cbbc00e54a28b3bb567a4baf8487153e3753f6cf7fcbff72c52520c8',
        '996a28e0a525cc85caea9cb2c8370ceca1ad188bd781eb53185a3b36e5887636',
        'b262570995a307ea242b5db918a30b3ed51f930596a57f588bb7f2bf4a291598',
        '1113aa3354c0e5f7cf527051d77d3142d5446d7e9967c974007018bb37e05ed2',
        'd4231fb5ce51464f1cae19382d3222117520e48d6c68e3e7cf0fb6da25527c53',
        'e3925830e03050c13e7b610009964f3e0ce6113c9917bb2af2321dfd4caa3320',
        '0560fdb2f7bff3adb13e95b809749aa14df90ee355402e56049558fe342453d8',
        '676627cded8852bd16ed84ac2eb4e78650fcc271ae0249e52c8f409d6a67e992',
        '46da69fc5e7e2e80c316b1327cde8e6dd77813e4451a9d5b5a8bc4e23db5effd',
        '75357dd7ce98b47dcd1a8142c7495115d90d91079eff439bd4975b099953202f',
        '2d90875e84956d6e43d7051d4331ffb1df33d1de773ed191ce2d0803ed738a90',
        '746495ae5d5618250e405455cf008ca7ff9491bb857bcd3aa74ecc28ff3ef9d0',
        '75f1e99b0c1c0808acbe6c2180b3607cf5fd6a4c91e9fbf4413bcaf6c603a9c9',
        '3754284b0a5740f93184e6d17149a5b483074bbf8e8e62cc14503cbb366d3de3',
        'b881240c3581b848255d2aee292b9ade932337c0f1b5c0fdf8e99ea060321818',
        '990220b05ded9d4bb890b7b7d656484c53b2566cc3d41678d678432261ccd0c8',
        '82fef0979b326b2650d7ea8c22113a093124aff7c3c64550eedac68954511bce',
        'c5b4f2e60fd7899cfe41fb4a78c513090c942d1951f8c0d0589cec1ccf0a10d9'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.031_739_948_424_187_15
  },
  pool1sskadl6p2w0ttfr60y2ssfzcmrnaty4wt68v5glzd3e5vwkh7z5: {
    details: {
      pool_id: 'pool1sskadl6p2w0ttfr60y2ssfzcmrnaty4wt68v5glzd3e5vwkh7z5',
      hex: '842dd6ff41539eb5a47a7915082458d8e7d592ae5e8eca23e26c7346',
      vrf_key: 'eb43de3c495d4edf46b6588db34279be27e52454ea8b222ba4ece410502d3539',
      blocks_minted: 10_606,
      blocks_epoch: 0,
      live_stake: '0',
      live_size: 0,
      live_saturation: 0,
      live_delegators: 2,
      active_stake: '10314134659',
      active_size: 4.703_629_194_842_437_4e-7,
      declared_pledge: '0',
      live_pledge: '0',
      margin_cost: 1,
      fixed_cost: '340000000',
      reward_account: 'stake1uxs6vcqc070ymgfl8cpzzw99rvu4s8p63cgd3h23s4gv4zqeg0qxa',
      owners: ['stake1uxs6vcqc070ymgfl8cpzzw99rvu4s8p63cgd3h23s4gv4zqeg0qxa'],
      registration: [
        '96c7330aa33684f841558843e95d8fd2113d5a1655f1d0052e5d46dc244e5d4b',
        '7d3eb82866b49636d40dceb4f12da979c364a2daa9c4ecc0303924be814803f3'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am: {
    details: {
      pool_id: 'pool106jtt06k5wjpqc5r5fkz06pgwhwaljzs624mnfua8fkhq0fl9am',
      hex: '7ea4b5bf56a3a4106283a26c27e82875dddfc850d2abb9a79d3a6d70',
      vrf_key: 'cab656d4bf431d2aebde10e2ec4c7b8f25479675dd96e90f5ba807189569ec4e',
      blocks_minted: 652,
      blocks_epoch: 0,
      live_stake: '0',
      live_size: 0,
      live_saturation: 0,
      live_delegators: 0,
      active_stake: '0',
      active_size: 0,
      declared_pledge: '0',
      live_pledge: '0',
      margin_cost: 0.06,
      fixed_cost: '345000000',
      reward_account: 'stake1uypawq9mepae4ag6zqdmu8nzm8ze66mrfzqnfzzg8qy9vnst470rz',
      owners: ['stake1uypawq9mepae4ag6zqdmu8nzm8ze66mrfzqnfzzg8qy9vnst470rz'],
      registration: [
        'ffe4522a9f32199d21ad2b01ac528a03dc29d012a9ccbb67e8cbbe3e9d977134',
        '82a610762552dad3d149cd3300b42a221424db3834ab895e8fd1e01fcaea2683'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool1xt0gxs63r5vgjsrzhm7jfuhuqzga9pf8kqvp38qmdzn3wjxudvr: {
    details: {
      pool_id: 'pool1xt0gxs63r5vgjsrzhm7jfuhuqzga9pf8kqvp38qmdzn3wjxudvr',
      hex: '32de8343511d18894062befd24f2fc0091d28527b018189c1b68a717',
      vrf_key: 'bfe8c0eaafda36b76422e0c64e7f654ce070d6c2b83bd3761f65dcc41d8b1e27',
      blocks_minted: 0,
      blocks_epoch: 0,
      live_stake: '2228964',
      live_size: 1.018_507_636_984_638_4e-10,
      live_saturation: 2.933_909_607_335_115e-8,
      live_delegators: 1,
      active_stake: '2228964',
      active_size: 1.016_490_524_050_349_2e-10,
      declared_pledge: '1',
      live_pledge: '2228964',
      margin_cost: 0.015,
      fixed_cost: '345000000',
      reward_account: 'stake1u82xxcvr3xufjy36trk4d0nzhgzwjhwvh532f9ak50q47xcnzky8j',
      owners: ['stake1u82xxcvr3xufjy36trk4d0nzhgzwjhwvh532f9ak50q47xcnzky8j'],
      registration: [
        '60d8079c9ab49bc2b0062243e461ca234f500b4fc0504dbbe05ab4c3e20983d1',
        '6b1c5240ed88e062de91295f1f6646cf2c83f09d5e60e9823d496487b4110b08',
        '0864b828143274cddb16e46244d57c95be08aee59eae839e90dc341b5faff2c9'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.000_834_040_552_604_387
  },
  pool1rw29y8c5md2rm4ynkrqhpm9saatd0a0xzyyc6xudelgkww5junh: {
    details: {
      pool_id: 'pool1rw29y8c5md2rm4ynkrqhpm9saatd0a0xzyyc6xudelgkww5junh',
      hex: '1b94521f14db543dd493b0c170ecb0ef56d7f5e611098d1b8dcfd167',
      vrf_key: '139babb5a7b32fd6bb6bf5c9184a9f8195f5734ea19f3037a787c6b516c64c73',
      blocks_minted: 2635,
      blocks_epoch: 1,
      live_stake: '10025963463809',
      live_size: 0.000_458_128_545_639_069_3,
      live_saturation: 0.131_968_351_795_991_65,
      live_delegators: 19,
      active_stake: '10040483542608',
      active_size: 0.000_457_883_410_317_282_5,
      declared_pledge: '0',
      live_pledge: '17865496995',
      margin_cost: 0.999_99,
      fixed_cost: '999999000000',
      reward_account: 'stake1u8nshzrg4qn0st0ccvldjak7cz2a02sys9g3s5aanvr5rwcfqe8fg',
      owners: ['stake1u8nshzrg4qn0st0ccvldjak7cz2a02sys9g3s5aanvr5rwcfqe8fg'],
      registration: [
        '48a473b7827107100c0e56ef2735a3ce0375087939f3c8d181a7890ff1441c51',
        'e9cd2baf24bfe4ba1ecddfd2ba9f7b0561faa094af82fcd35a5a180f35e3cccf',
        '80535c1535d95ef8ff338f1e3622f2c122cf688c25a1bcc5807bc85083e10b82'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool1pjmqlsyny06w0x60rfd3seul5xc9pluh3t08y55ylhks28jeh7c: {
    details: {
      pool_id: 'pool1pjmqlsyny06w0x60rfd3seul5xc9pluh3t08y55ylhks28jeh7c',
      hex: '0cb60fc09323f4e79b4f1a5b18679fa1b050ff978ade725284fded05',
      vrf_key: 'b532e569dce753b50c9e7580b765324acdc561d4346332959ef557780d69cc75',
      blocks_minted: 2488,
      blocks_epoch: 7,
      live_stake: '24683458314562',
      live_size: 0.001_127_891_289_431_922_9,
      live_saturation: 0.324_899_978_157_338_07,
      live_delegators: 8,
      active_stake: '24675409883046',
      active_size: 0.001_125_290_508_199_082_4,
      declared_pledge: '10000000000',
      live_pledge: '317586067471',
      margin_cost: 0.999,
      fixed_cost: '200000000000',
      reward_account: 'stake1u96he33yhyg8ysvzs4dnvaj2hz5jnv5n7x95ssdxvzmay4gpnenty',
      owners: ['stake1u96he33yhyg8ysvzs4dnvaj2hz5jnv5n7x95ssdxvzmay4gpnenty'],
      registration: ['96c93a6454a63fcf60ff0460e3d8020fc7c40f59b684e1fa0af393b9354af39f'],
      retirement: [],
      calidus_key: {
        id: 'calidus159ardcaqkxjdgetc5h2eraecuaw2rxkqzeqkmahakssuwqgs6gana',
        pub_key: '9935f1305917f270991b7c11eeee3dbfffab9c758f881a4efe293143233a7252',
        nonce: 160_081_011,
        tx_hash: 'e883dc330a0404ae8b033b5cd88d114a988232009ec32a12ba5ce51760fa758e',
        block_height: 12_081_989,
        block_time: 1_751_648_165,
        epoch: 568
      }
    },
    ros: 0
  },
  pool12udshcl3ycj4qpxes28n0ugsye23h89rj8z2a5ast4482m08xe7: {
    details: {
      pool_id: 'pool12udshcl3ycj4qpxes28n0ugsye23h89rj8z2a5ast4482m08xe7',
      hex: '571b0be3f126255004d9828f37f11026551b9ca391c4aed3b05d6a75',
      vrf_key: 'e9ec0d6017e5741fee34f291c7640b01863c4a5d879cc439bebe838e7ffbcf4a',
      blocks_minted: 8653,
      blocks_epoch: 3,
      live_stake: '26916453522643',
      live_size: 0.001_229_926_256_025_398_7,
      live_saturation: 0.354_292_135_653_475_8,
      live_delegators: 32,
      active_stake: '28415670651318',
      active_size: 0.001_295_860_316_792_929_8,
      declared_pledge: '0',
      live_pledge: '40691045011',
      margin_cost: 0.9999,
      fixed_cost: '35000000000',
      reward_account: 'stake1uyz3wlpgfe99hrknpuqm4ly0zz0jkvz6mmlyvy8rp0cetes8ucp5d',
      owners: ['stake1uyz3wlpgfe99hrknpuqm4ly0zz0jkvz6mmlyvy8rp0cetes8ucp5d'],
      registration: [
        'ca834c9d0f2df35127261bec3be38bda355fccd16d18fa60778b98d16b7917c0',
        'f51732e3e9fcdd5f4fd1e9119c8d65ced476efd7856c83586e41f52945843539',
        'ad4d341e5eef66e2c2d63889cf5fe72cce7adf0f97c81b3f9ef44587b15072e2',
        '054c3d401250b548ad4204b5bed2e492619cb1e94ef55cbb01879e9233c35d03',
        '5546cffd78f20d4833ad5cfe84b52fe13e2b45fc9ca07ec83211e823207c47ec'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool1wm89xjqp96t3mlun3pa5suxa3t4s5lluq239en0nxl7pcm5tprc: {
    details: {
      pool_id: 'pool1wm89xjqp96t3mlun3pa5suxa3t4s5lluq239en0nxl7pcm5tprc',
      hex: '76ce5348012e971dff93887b4870dd8aeb0a7ffc02a25ccdf337fc1c',
      vrf_key: '34cc231ea9569610d9dcec58d2a276f9216708134f221bc7607ee16448afc1b5',
      blocks_minted: 391,
      blocks_epoch: 0,
      live_stake: '109506640900',
      live_size: 0.000_005_003_820_162_962_899,
      live_saturation: 0.001_441_398_720_676_989_2,
      live_delegators: 94,
      active_stake: '109506640900',
      active_size: 0.000_004_993_910_300_724_211,
      declared_pledge: '1000000',
      live_pledge: '13731779069',
      margin_cost: 0,
      fixed_cost: '2500000000',
      reward_account: 'stake1uxwzqfk36yh74vrezz8k53f5wf66ke5e2xyt3dupcj0ahnc26ehw5',
      owners: [
        'stake1ux9lnjq9k5ax4grx82md6kle4nsewl4x09jj2mwlnw0kymg7lz362',
        'stake1uxwzqfk36yh74vrezz8k53f5wf66ke5e2xyt3dupcj0ahnc26ehw5'
      ],
      registration: [
        'aad3c51cb5e7a6e1084d38898e966221bda6d60a3a8ce5ce3313a634a37b6cb1',
        '478d0c80e95c2ee626d159f8af1739ef367cd324ee2732535bf94a30f4ed77c5',
        'aff17533ed67ca0d148bf957eeca96b1b46270cc17e854dc0af5710b436f0bd8',
        'a3a2c33c4bb64415e212346e23e161c10cc437f0034f0812c4e4f2e063781ba4',
        '448b536782b39f5f03aa53c2b0b49bfbdebc6fad374457085ba9c8f34d097e1d',
        '444faa71f697d9e9296d5bb92eebd75bf53d0f24e725e0719ea22256a85792e6',
        '1e96dd9e647f9bb74bc2d1b8f82805c12bded1a5b4c6148a7c582b931de91e2c',
        'd2343a17dfec4305800b286f4483794ab19180043376b2802e1372a20d889581',
        '16c03ac0b2185ef5e8983c1e3d71cbef111890df622d4fb2ef7b450fe63aacb0',
        '3e1d46308be2e4cf2ca7bfe2be0973db17a74bf7f93b88a0fd24acf6f949d377',
        '23bfde98a150c1825dad3670bf6702b8887390be86faa6a8021d0083b51734c9'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0
  },
  pool1rj6apcqxcvavaxp22f75zs9upphena7ntsnut2efvq98g4404up: {
    details: {
      pool_id: 'pool1rj6apcqxcvavaxp22f75zs9upphena7ntsnut2efvq98g4404up',
      hex: '1cb5d0e006c33ace982a527d4140bc086f99f7d35c27c5ab29600a74',
      vrf_key: 'ec64fa7dfda3044d38efcb424fd9ff3dba355674bfbf2b224c06a2443afe0344',
      blocks_minted: 5375,
      blocks_epoch: 1,
      live_stake: '2240931653046',
      live_size: 0.000_102_397_616_228_344_7,
      live_saturation: 0.029_496_622_225_630_476,
      live_delegators: 411,
      active_stake: '2280985466757',
      active_size: 0.000_104_021_424_861_731_87,
      declared_pledge: '10000000000',
      live_pledge: '43476417043',
      margin_cost: 0.01,
      fixed_cost: '930000000',
      reward_account: 'stake1u9ud4fe2wqg7vndzxkx4q25rgqrmtm5pm94vn5xp4yt4ugsyxy39z',
      owners: ['stake1u9ud4fe2wqg7vndzxkx4q25rgqrmtm5pm94vn5xp4yt4ugsyxy39z'],
      registration: [
        '821dda9b419f69337989882b878fa6c723e3f49fc1e023751b920bdadd0c2b9b',
        '220390afca9d75bc813d1a015e9a727d188aa4981516603be7cc664abe180bff',
        'cdd722bd47ea148d85f56a617481ba3027663001567840c3ca8a0e86f363dac3',
        'bbcba1b631f41c296a159fb7a840891e140115901c91a3b31ad10ccb8c6dfcbc',
        '6749e62a528fe0c4bfc1f1966cf08f36df454dbc2eac418c8f83724bc8de126b',
        'cb809347a3294796f18737211a9f4fa79683ce615c85edc7990bf782347ef4ff',
        '428f955725b2ee6ab00ce7ff3c7623a54cb41a8e8025ac7d0a205c0a480797fc'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.023_746_303_862_673_29
  },
  pool1hezakp5r240dy4fcsm7mfd3qqahcvyrhj8hl770yxmxxzdwvcre: {
    details: {
      pool_id: 'pool1hezakp5r240dy4fcsm7mfd3qqahcvyrhj8hl770yxmxxzdwvcre',
      hex: 'be45db0683555ed2553886fdb4b620076f86107791efff79e436cc61',
      vrf_key: 'fa06337a9bf426872b3c988227fdccf95632996d78f5fbde09c9511311966bec',
      blocks_minted: 650,
      blocks_epoch: 0,
      live_stake: '3873292277328',
      live_size: 0.000_176_987_056_082_206_35,
      live_saturation: 0.050_982_830_698_340_25,
      live_delegators: 9,
      active_stake: '3871506306523',
      active_size: 0.000_176_555_093_504_506_85,
      declared_pledge: '500000000',
      live_pledge: '12947514520',
      margin_cost: 0.9,
      fixed_cost: '340000000',
      reward_account: 'stake1u850ppapscfk2jxav03err837c4xh5engfaerzaeld0r2vq0j07tr',
      owners: ['stake1u850ppapscfk2jxav03err837c4xh5engfaerzaeld0r2vq0j07tr'],
      registration: [
        '29b6421f03e3e29bb19ab5b2ae85e5786fe27f1234429d6feb3bc9f864631907',
        '6fc79d14d86e8bef1b60dae3389851c8e59a5d1cdc3d40555970cb546af87ca3',
        'f1248878cc43f9af1a9c11e8e8a90a7bd46e16ce84bfe6757349160a532ca18c',
        'fe092d73ed35e92486933549807b0ad681eb914532d0426b5692c711603bc462',
        '88049ae57b1f0aa40b8af7e3ba3ef8b8b2707b6862d9179febcedf85cdfabde9',
        'fb48f6e889a0522217ab02d11f3b8ab1765f131b521e55663cea3ab3bec534c5',
        '02ec3d76ba3bef3c4e290d9d1f3216fbcc293d84ad1a1865ca264da6644ec569',
        '17f2eeba8d853399e730e30a6292ecd18f8dfc9ecf9d0138ef83a91ea0e11815'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.004_769_854_990_042_122
  },
  pool1a6ysvnx24xsjh2f6ehgmx7yu9q45fd7lsk88v2swxkek7pkxtgp: {
    details: {
      pool_id: 'pool1a6ysvnx24xsjh2f6ehgmx7yu9q45fd7lsk88v2swxkek7pkxtgp',
      hex: 'ee89064ccaa9a12ba93acdd1b3789c282b44b7df858e762a0e35b36f',
      vrf_key: '109f7fb0c21ad4335bdb1bcb02cde4f09754210f99dfabf4f3369b71a28716c8',
      blocks_minted: 3432,
      blocks_epoch: 0,
      live_stake: '9983355989866',
      live_size: 0.000_456_181_630_498_063_5,
      live_saturation: 0.131_407_524_087_936_93,
      live_delegators: 62,
      active_stake: '10005000606243',
      active_size: 0.000_456_265_256_386_554_8,
      declared_pledge: '15000000000',
      live_pledge: '15601725710',
      margin_cost: 0.5,
      fixed_cost: '340000000',
      reward_account: 'stake1u8ke6rs496ekh50nmr87fjdnrzszjtfxd8rh9z9z5xwu2ege3nqdp',
      owners: ['stake1u8ke6rs496ekh50nmr87fjdnrzszjtfxd8rh9z9z5xwu2ege3nqdp'],
      registration: [
        '12417c660ee525139041b5c706f5140029cc4c141030fe8408a97885a981f47b',
        'eb87d570217bd97ee8587ca47537568644adc48195c03e60b965b20caa89e76b',
        '0223b74fa5cf4d64f4632fcce711448a813d14659f411493c54177c5a754d21f',
        'a042ed64c2e9b48bc2277ef15706a0a957e8743789ea8a70c892dc2c0fbcf7fc',
        '6c146710037c60415a1e49d9f93d58dc58f6f1191ceda6ae9dda78326596bf30',
        'e316e427aa02ab66c7acb657d2193e0d0bf45aa19d70a1346f5daaf7425b8b5b',
        'fbad14707336165cac3831cac2c9f939e5dfefb8b19b2f33414e43a4acd2986b',
        '8a17c707f5f41016c2df876cefa112219468b941d760133a37bc1da894f9d9c3',
        '9d8876bf34ff51b3b9a49cb7e12ec836626ca8207cb630d7faff9c9b383526ea',
        '05fdacbed5976e92dfe112a3a82441c1592a8ef2ccece60441bc2d2c5c75df10',
        '1219ffa316e8f75f3e9dd50b13f71294d79b410a7edaa1600dd64c8ced680dc1',
        'ea6523ba61877831508bfda674aa2964a2d889f59137a0865675d611b29ce374',
        'a5ca7fdace308f6b9153aa5efc7d38f1544d89bf02d3e29276f763dbfd8fb7a7',
        'fc58f493c195cbd343c66b88bce760d2c5e1a813e3b68142222a917518d3eb91',
        '1badb954d3ec46898e757d8cb5dec3c0e16d6e51276dda7b4bcfda78cb4f003a',
        '934ae03b9fff265e4893d37b8e4d425b2e8bca14dbe8695345db267ce9a4609b',
        '6ed89dfbb2af3e2a4333e2ea2d1b976af765e4bf88bce289153a235e50eef507',
        '17a99bd21979dc9d33a4c51d28e810b76e3a94f09ff2985487ae92ca07d2079d',
        'b162a7a8878d8feb268c1eed497b8be062e38d26a52339d1063f9d35ac1b62f8',
        '71f78ddda2af3902b55c1b229f0ed062615d783408845b9bcf5f53ddefc221b8',
        '1c0525f25c95638469bc55471a28723df1a61a57a87e99b1d963d2857536d7cf',
        '8bb729d30c5ffc0b762ce8e4ae22408427fa179b4cde3af5d8a88ce7ce1cbc10',
        '9f7216dabd3c9531e5b0ffa902ecf43776694bc0a5fb33a50a201159c32422e6',
        '23c94352deec1be4a6aeaa44b3ad6f8666ae7ff3429ee5c94190086aa13220c1',
        '025da4a11493596dd036f9821f1aed8c279020c0c24e870c6b9ada476df1b359',
        '827a6ff367fada9bc332d6e9da815cabb6147f3211631a93807ef14ecf150d13',
        '1a31d55bf15f305aba44ef6f7e1642b8cbc600403566f7982a1e23c0ac741bdb',
        '9dfa06ae097ff9d603a429156ee48bfbff29efb043fac320978fc5fbbece169c',
        '67ad2bf922aef486db0ff54c50cb845fe5de1e24a7f8d52a067484ee05f2a98f',
        'db86e36398d689f3febb1f8a5082c28563e14a62237950cfefcf2a2a30216179',
        'cbd88623fcf759e41748aaf3ce0c834452f71718e1a85f094997a13a8f8af6d3',
        'bddeb8a2538cd786b170b50670c4a1fd6ff3c7c146800cd5cb00369379ccaa96',
        '1c2646b24f66954a0d170373c1826d7439245fa4f369da403e4db1107298003d',
        '473de426d8ae6844cccaa2bd4ea96b5ede95f90b2c7ed96037676899a23d173e',
        '19e9b17f0eba0767aff0e5ab6bc36ad59f4533c2218db4e296f9d581a20861d7',
        'c13f3f578662771ca72d2bfec8da22cc954430bfff0791a668ddf5a4a17724d8',
        '9c776d489c88ce258faa0e05f89e224a7dd9c441d7c70e33288d1637e1606122',
        '73e251210cf1a273b96c0a0124896f6a11f530cfbe8996d9fa7af1d8f20d98f9',
        'b24b83c933588f676c06de09710789fc67fcbbf5f4e7ac49d419586714b9f262',
        '14854a64a8fa8704edd706fe3edf8cb962f1311362a26e3aced2ffcbdd6a9f85',
        '8b6e19b08c1f66e6b78016f8bbb4204b234440d6b35ae31f7cbb8479b916782d',
        'd96ad0cf05b606d9a32a671cc1a8cb92ceaf200bd5471fa622e548a522318e6e',
        '7ad5aacf65919596d00664f24fd126e44185a6c1ce4ccfdceda9248cb5618aab',
        '2d7a9202bf2a025eb15c683327426cda909ae1436c10d38f5e95b8cff726e77f',
        '7c2c65ec6ae1b5a4a7865f19eb064ad946658692e6100c0b115eb01d90460969',
        '11af332889a5166d92e575f57b50b4d57bbe6b879b431767a16286bc5f25c407',
        'f1950e7b0b8efa03d0bf686040dcbed0061d098184c0e8b8ea67770502d6e5c9',
        'bf796a6c7f06a36680c5829c38481c634465105681b1d46861246dbb1aca6852',
        '9d91adb2a230e60dffcd173da6fdec39287af2fb49b44b0e7b2bb360e87ec80d',
        '5c5f80049897dbf866505f961dd0b0484ee40cb0e14e8b31cc526418aeac78f9',
        '5be504345923a4c7ebd3c3df7d9aac2a889b8685395a6f31d4aef7ae5b351d94',
        '92e846336a36f298130fe4e529527bc0164f0428af057d2a49ef811f76a4584e',
        'ffb31e9786f4b31bad0a7bf37f4098959a3a82e29d88283ef1e4537e711d5a87',
        'f70b3a74caf9c4f1c5b49661b65d844d001778368f90219b043e6e47d2cc73fd',
        '40227152d1b284c41de9e62134610a9737e0827c3b67301f9b1652b123f39f46',
        'fb88b177139543f0cd7127fc6a053c173dee596fe78ad149b61625fb6473c607',
        'd4b51961c1e2fd48d47d22e69f7d5ea813d605d90569b50cb184bfffc8ee06d6',
        '6557b7973323f1bfee21080e77b280bfdf0517ca82ace8dfca84becd30470d2a',
        '4219f20aedf1d11777a0109b1dd03d782943b3e4e127d259d7a8919ceea229f5',
        'f174c4ba8ca2bc54061ce4c20596b6943db951183f661a0663787f96b81065b9',
        '33053f54b6343e50746a0f5ea01da10500b506dbd282b2cb8e615f1865ac1cba',
        '382cffd6b7539100464855e5ad95431e12917908cb51877e6ae24a6b2d9345fc',
        'becc74f1c4276613255892114a5d9cb250975258ef430e926324d9292b92b0e7',
        'cbcae9f8893403115b1c5d5207449d5408c0094b489e910ad8af37c1e1720b86',
        '4aba5f9cd3c9096b806332309e140d8b864ede405f69b06d9a8c2a7f883fec56',
        'a8aa70fb6d6eea38da0f63d2809be464692a1bccb3e2aa583f95ecf23cef82fb',
        'ce74c608dfb1493c335cb1956def2f26cb94e41e3703dad40ebf9778bfeba12d',
        'c25c1417028c8362696b85197fd4778d66c5e3a38710f498a4c661e18de4d4b9',
        'bf644838a3fe0417a41234a33b3e2d6a0f7594245ee2cca32c392acbdb5d1974',
        '435d866ff06a6b353597e18af8db1680726620475965d016a270f10571776d84',
        '856f35512f8bcb0e6159b0de782cfe204fec91be3b3057b6c57a3d9ad97dccaa',
        'dcafcec87532fc6ea30336239af650d3b22102b9b2bb9a0983b321ae2e049cad',
        '1cd38276104f67020891c5cf80f95945a5cacaa64a7dba4579f5344743af889a',
        '2d349c681d2c0699d19d5837c9a867f72042f63fb168f9b4be2227a3d6e89a8b',
        'd7b7d30309f32f7b18d632d430f8ca8fbe0de45aad9c38846a428bcd752ebcaa',
        'e1423864309b2ed050df7c962b1abdf7eb1a9d8a960b1c25973c582307539071',
        '533b4d6d4de2aea068ea91f404681193b84a14d9286aa3cd7e1ec5f87734bc8c',
        '1f92c42dd5413f726c3bf38160e70a56e1940dec7c036146dd0f90220f32860c',
        '05f354feeb446642b6a704e12e8a5adc1563eeb63b45dd1a72e1f35a93d9e5bd',
        '648afbf00b9d620d8dea2266010558eed58df1771934bfef9dcd13b8d4afaf82',
        '1fdc92a43f23b0f965a479ea27c565eec0c756f9d4356973bcfa0824a71e99e6',
        'b2179119b8930438f49ec02e9f480f82d92343826fa80edb4e5e1ab06caf2f2d',
        '1f3e4f6df6cf680fe2ffab7fdf99f36e816c269c9ece1ff996ed0419ce71486e',
        '8df0a7dde8c3ebc2a6056193650e595742148506868bc3b1096a21eef7355e8a',
        '987be0eab03d681fed809c744417738b89e1a782a2b99376864a8c9de9fb149d',
        '300d380af2499c94308dfe7dafd7a68f67aa8473d50c185f8ba8c8402c1183ef',
        '241797c4f3593963021da97c2683892e4151effca4a17e5d7d9eca5e62afa636',
        'eeb42888e9a17d09d6133eac1034d57adf834556e677f9aef09179eb53df8daf',
        'c195a0b32bfb8a5b819ac0757cf42332b3ff916d532432d3b37bdc0379b7b227',
        '30a0edb76dde48c1427cd8f0f8067098d47e58fd0dfc21093e381d8771ddd460',
        '00150dc25d9455c4db0405e3d29151f92ae105c6062a0f5abf15731ed4886db6',
        '2b46aa3e4b4dae577279be8e7fdbc7719fd350943c98bc97e428ed095a74657e',
        'b7901da9abae1a58ada00abc7ddf798a35022a9faaa9439eebeb2722d9063305',
        '5e9e08f907243d5effbbfae4a786eff539411758ab84739f97c407060783bafc',
        'ceb38fa46d929657c36aee8bdd10359bb5a2b1f8ef797f547c9929c316670c0d',
        'aea3396ad2a18caf754fc392ae758658a144f4852f226f262d42c07e20f075b9',
        '31a4a95836be907d56aac8dbeb00a3154814379fd1de7887a6e1724142e2e535',
        'c2cc99e46470f8f3cd5c6f2dea07b44ff6db76894acd2f31eb68662095f0850c',
        '93a848954bd66b1202828179295abdb39c34b62e07663e84f11b220767973789',
        '8adbc40fb9d7786e35099307fa45c8d13cdacb0bdd1d00f540162fd26aa9a9d5',
        '6f018fdcda8f841b5924197506ea9dbeeb98cd605fe22151193ea2ad954f5361',
        'c0fa024e55e6eba480eee68467132c8dd62503b8db745c9f5df97119741fb2a9',
        '668abfb69017910b64c0126b5b1b0da4ad1451315189b0da104038c430f50aa8',
        'c65a65ab5fc5a13c0b1d9437bf4ef6a8e149482bdb07dc12e6fdef12a30a622e',
        '91a8d4847671b78572fa4ccb8866957b589e7d8dc46698f54834fc46a072af87',
        'fdf28aabc1970685823a7512ae359592eda6d983f744a436431daff8604eee5e',
        '4a7d05927a2d29bcde9824207f4ddb5977a8dd192143ba336e32a78ba51c4164',
        'a45ecb55971e382b440a3d7b828240054e8157d8724fb61617f488d8bfac81c4',
        '85ae60955c85f1ea4db43236dabab002e9253557f3eb0c4acccfb44088cbcf7b',
        '03fe3147a0ad3f92c752d0d2749a0141bee42bffb493e95473b7d71894b77250',
        '3cfd05f5241cc7ea0e1f4d5ed3500005ae474bb7e4938316533c033b5cd7f9ec',
        'dd227739382619e100ff3e524c0c15c059cd00a6887245515ce1a64d05f371f6',
        'c5eebdfbd1ad4df43fdff492ada770bd948fc31f16d504902f3a6f2273fd2be4',
        '20ae52dc6f8a495f1c6f4721845423e9264251fc27600d6275f64d0ec44afb23',
        '192c283046520aba0ac167904fa5f89f7570ab9306da03aa44543e1451b8f513',
        '8fe58c485e0c23ecf759758a8310b4b72a801cd71eacaed82172f78782484fce',
        '5581cf207b3b05ea27d9ffdd4e9a09e5e46fb796bd2792cdce11d5a56b4cff0b',
        '3610de6530d32e3156d85b69d5cc94708a818add50bf0eecb2da1f5284d2e4f5',
        'cedc6135fd551e5a563803adbcda674d2addf7cb6d1d613d43decf4646680ea1',
        '62bc5b52751afe47ed5b978f5a7fdafc34431a03c3c2423051e4f5fd9daa6c5b',
        '21c8ff7a9f74c4da7dc4ebd2788e2d805945615c50e3051ffbfb34d407de726b',
        '434e38b4c07a3f563890efc35541f45a30fbd6a44368dbe78c2bcebe3729839f',
        '1d8a6aadd5edb036d38d6f6efb96d44ca940bcd71b3791df56c4b433644cc091'
      ],
      retirement: ['b5d5d7b32c3c9f4c40f9826453449988780c4cccb2aecc7d091e3f0fda7c54df'],
      calidus_key: null
    },
    ros: 0.026_084_633_210_397
  },
  pool1522rtve5zlgnlh3zm5a4mcy3u7gpndg3kkac3xyzxmp6x6weca3: {
    details: {
      pool_id: 'pool1522rtve5zlgnlh3zm5a4mcy3u7gpndg3kkac3xyzxmp6x6weca3',
      hex: 'a29435b33417d13fde22dd3b5de091e79019b511b5bb88988236c3a3',
      vrf_key: '8064fec405157ef38c780d9b0f6d5b92469faaf342de9bf7fd21eb8853d72057',
      blocks_minted: 822,
      blocks_epoch: 2,
      live_stake: '13822124570806',
      live_size: 0.000_631_591_153_321_405_3,
      live_saturation: 0.181_935_931_096_556_42,
      live_delegators: 37,
      active_stake: '13818562866484',
      active_size: 0.000_630_177_885_770_026_7,
      declared_pledge: '80000000',
      live_pledge: '26362358832',
      margin_cost: 0.25,
      fixed_cost: '340000000',
      reward_account: 'stake1u8dnm26j52uzgswf7kut4d060a248adtz4w83mtalhf2llcvfhj0q',
      owners: ['stake1u8dnm26j52uzgswf7kut4d060a248adtz4w83mtalhf2llcvfhj0q'],
      registration: ['802f71ab789963c1a4269ed7056a278b9d74d7039b57da6c15007cd7f9b49fc9'],
      retirement: [],
      calidus_key: null
    },
    ros: 0.039_918_653_777_090_36
  },
  pool1gaztx97t53k47fr7282d70tje8323vvzx8pshgts30t9krw62tm: {
    details: {
      pool_id: 'pool1gaztx97t53k47fr7282d70tje8323vvzx8pshgts30t9krw62tm',
      hex: '4744b317cba46d5f247e51d4df3d72c9e2a8b18231c30ba1708bd65b',
      vrf_key: 'aae504e182d167d71dc7abd90b7fdee51dd22e3903efb6265f0c50bbc87d4a54',
      blocks_minted: 5602,
      blocks_epoch: 9,
      live_stake: '57429417265266',
      live_size: 0.002_624_192_228_867_351_3,
      live_saturation: 0.755_923_913_792_331_6,
      live_delegators: 32_468,
      active_stake: '56927344402533',
      active_size: 0.002_596_098_732_169_989_4,
      declared_pledge: '100000000',
      live_pledge: '9881688202',
      margin_cost: 0.1,
      fixed_cost: '340000000',
      reward_account: 'stake1u82rpahtu4vl22hcrl996q2zzphwy42se47u30kl5jmsfegd36muh',
      owners: ['stake1u82rpahtu4vl22hcrl996q2zzphwy42se47u30kl5jmsfegd36muh'],
      registration: [
        '155a4fee7b70157c9497f05aa4e8c97317edb4ddd449b36f94395d1d3dc69a90',
        'd399de8da1b4aed9cbf918c9c2b5c3da114bc306dd31acc0eefe757fdae2641b',
        '755abecfd180083129f463301f6b5b7d1222058cda684f8c837bd50ddb904155',
        'c4d0db5df2e8618183bfa018c7bae5f4ed9d255433fd7f36c6dbd87a2f59135f',
        'd31deb550edc7fb3ff8e8f8ee616293bdd5c629572f07e554e8926351cd1f90f'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.037_316_833_560_096_63
  },
  pool1gsfu7c2ac6rh45dn836myms9flp99y0erppqez80nwehk9c70eu: {
    details: {
      pool_id: 'pool1gsfu7c2ac6rh45dn836myms9flp99y0erppqez80nwehk9c70eu',
      hex: '4413cf615dc6877ad1b33c75b26e054fc25291f918420c88ef9bb37b',
      vrf_key: '8446a911ed7cdf5c802e493eb16a20d3d3af2df99b51a4811cac84a5c95aba64',
      blocks_minted: 252,
      blocks_epoch: 0,
      live_stake: '500647786',
      live_size: 2.288_005_722_968_331e-8,
      live_saturation: 0.000_006_585_808_520_620_812,
      live_delegators: 1,
      active_stake: '500647786',
      active_size: 2.286_204_595_609_873_4e-8,
      declared_pledge: '500000000',
      live_pledge: '500647786',
      margin_cost: 0.04,
      fixed_cost: '340000000',
      reward_account: 'stake1uynam6a655dlqxstmntkamupweyuu9346ekjgfspc563jjgyyuj7t',
      owners: ['stake1uynam6a655dlqxstmntkamupweyuu9346ekjgfspc563jjgyyuj7t'],
      registration: [
        '36171685d44f4b934e2351bf1423663c15f080d6a588d11fc18c44fb72488ca9',
        '270633a3b7337455b32fa4f3ded0debd15cbb2484d0013efaa3fd699e8365895',
        'ccbd1b5e6e2666d000dc03e48193b5a81d2469d51cc92d73b1c92eca8f9cbd3e'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.021_118_720_873_503_083
  },
  pool1pg2k7lp6w68vlvdycug2ycu3mkrt0z4ftxay4g8zchj87mw6ug8: {
    details: {
      pool_id: 'pool1pg2k7lp6w68vlvdycug2ycu3mkrt0z4ftxay4g8zchj87mw6ug8',
      hex: '0a156f7c3a768ecfb1a4c710a26391dd86b78aa959ba4aa0e2c5e47f',
      vrf_key: 'f8f5ba15e5e4a8cca6d2d1ec85616311fe6b7440795950a3feaa7cfac24ac75f',
      blocks_minted: 193,
      blocks_epoch: 0,
      live_stake: '1005175300',
      live_size: 4.593_742_154_262_535_5e-8,
      live_saturation: 0.000_013_222_653_211_648_44,
      live_delegators: 2,
      active_stake: '1005175300',
      active_size: 4.590_125_941_860_318e-8,
      declared_pledge: '1000000000',
      live_pledge: '1005175300',
      margin_cost: 0.02,
      fixed_cost: '340000000',
      reward_account: 'stake1uyl3vhvdnwv4vn0pxvrm378rj5lteqr82sxmcppctdd4n0cqvefmk',
      owners: ['stake1uyl3vhvdnwv4vn0pxvrm378rj5lteqr82sxmcppctdd4n0cqvefmk'],
      registration: [
        'b77bdf3718563ab9f971a1e779bee617b6da627a190a7e35b7c2a8be3070b5aa',
        '9756a1cbcb745abb9109e93f08ea0c2c6a4c2da3dfa6b239bbef93ad84acdaac',
        'e99a7474ce5060e9e71af3543a00350a1e864a95a96dea31dbf53df12c05b808',
        'c0151d2bc976ceeb85d7a4288a6d0ea5805dac935d7cf3a2191d5fde359e9c87',
        'ac7a43e2afd9c063740372c764e0d9ce7c5d580825d5e4b891946359be780e26',
        '30ed807b8e85c2405f1c046c76c361e96a5ee501a81cf028298fd0b23d85b06e',
        'b6e4cea27bd39c8f0a283d8b42a334ac987d8f88339c265a20924fff6438d34f',
        'a44a6446b6e34a178b6935db78d8f2b658b1bb13ba9d37a26446fc20ee4b7035',
        'f3d2882ce51799eb06ce0327edb4b106f7529136bdd0a608d573cbfedfaf382e',
        '913b5d4462aad88efccf39ae306723fe94b335f084639ec070acb19af72b28d6',
        '82f38bd2faf913555af05d509e6b9bd5bd8c3ce0ccaa6c7f702736d5a37f4763',
        'de64547e4994aa7afffafad92503244c2436f4b34d1aecab12e863c776730850',
        '1e9d628b0721820b847238aae5a1337685f4613e1591529fa3e31abed12acdd3',
        '2e66270918a34e12414cb3f58ccb051f1cf32a684f4a8753ef3c49c0b8f6edc5',
        '0b01b72196723f1abb04de2799030a32f40394d7d587c6a1f27140bcc832be89',
        '4e3d501f136a8a9f73ee244837e05bb699132a0f7610535a038ce8f69e80ed0e',
        'd90f9191bd904278592c66c178202da120fca7c0807999aa91cbb139c4bf5147',
        'a72330eb517d7db655330f1ca869e120286e5d17c22df52650c625aad0b637d1',
        '3f27fdae30d3c82c3455b105bb4bfc0483e6038c5521398d430d7b4175cff267',
        'fe260ca9ad08359eb1796fbe68477c9dbad7cfea6a8662fd440bd42d45495bb4',
        'e14d764e8665e5b97d330f136cda3d578573acbb421736a00a9de83920c3e1fa',
        'ec697f5dace4ad267a1d66bad169c1e99284064b0747d7780dd21d045119fab2'
      ],
      retirement: [],
      calidus_key: null
    },
    ros: 0.024_619_120_927_203_753
  },
  pool18gxqszcsk9yt0jsnzc293556x5t0cd0xdepr69wta9rh23349j5: {
    details: {
      pool_id: 'pool18gxqszcsk9yt0jsnzc293556x5t0cd0xdepr69wta9rh23349j5',
      hex: '3a0c080b10b148b7ca13161458d29a3516fc35e66e423d15cbe94775',
      vrf_key: 'ef122b3415d6336d3e59204c14f758e8ee986177eb2457e099e80836d1178f27',
      blocks_minted: 0,
      blocks_epoch: 0,
      live_stake: '5018662003',
      live_size: 2.293_573_986_664_490_4e-7,
      live_saturation: 0.000_066_018_362_421_107_98,
      live_delegators: 1,
      active_stake: '5018662003',
      active_size: 2.291_768_475_946_331_6e-7,
      declared_pledge: '5000000000',
      live_pledge: '5018662003',
      margin_cost: 0.15,
      fixed_cost: '345000000',
      reward_account: 'stake1uydlrmc9t3k2h5t0l7dd7k9j2kp8nakdxqjg4x4h2cmkhjcqvpars',
      owners: ['stake1uydlrmc9t3k2h5t0l7dd7k9j2kp8nakdxqjg4x4h2cmkhjcqvpars'],
      registration: ['2b85fe58517fc6ca0f3ebc9d4de4a7fd1f54be52aa6a63de5b562177eda26895'],
      retirement: [],
      calidus_key: null
    },
    ros: 0.024_240_674_285_476_16
  }
};
// cSpell:enable

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

describe('StakePoolService ROS', () => {
  let blockfrostClientMock: jest.Mocked<BlockfrostClient>;
  let extensionLocalStorageMock: jest.Mocked<Storage.LocalStorageArea>;
  let networkInfoProviderMock: jest.Mocked<NetworkInfoProvider>;

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
      if (!url.startsWith('pools/')) throw new Error(`Not mocked URL: ${url}`);

      const result = details[url.slice(6) as keyof typeof details].details;

      if (!result) throw new Error(`Not mocked pool: ${url.slice(6)}`);

      return result;
    });

    extensionLocalStorageMock.get.mockResolvedValue({ [getCacheKey('Mainnet')]: cachedData });
    extensionLocalStorageMock.set.mockResolvedValue();

    networkInfoProviderMock.genesisParameters.mockResolvedValue(genesisParameters);
    networkInfoProviderMock.lovelaceSupply.mockResolvedValue(lovelaceSupply);
    networkInfoProviderMock.protocolParameters.mockResolvedValue(protocolParameters);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.entries(details))('%s', async (poolId, { ros }) => {
    const stakePoolProvider = init();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { pageResults } = await stakePoolProvider.queryStakePools({
      filters: { identifier: { values: [{ id: poolId }] } },
      pagination: { startAt: 0, limit: 1 }
    });

    expect(pageResults[0].metrics?.ros).toBeCloseTo(ros, 10);
  });
});
