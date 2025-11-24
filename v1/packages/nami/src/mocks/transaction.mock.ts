/* eslint-disable unicorn/no-null */
export const protocolParameters = {
  linearFee: {
    minFeeA: '44',
    minFeeB: '155381',
  },
  minUtxo: '1000000',
  poolDeposit: '500000000',
  keyDeposit: '2000000',
  coinsPerUtxoWord: '4310',
  maxValSize: '5000',
  priceMem: 0.0577,
  priceStep: 0.000_072_1,
  maxTxSize: 16_384,
  slot: 62_415_854,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
};

export const currentlyDelegating = {
  active: true,
  rewards: '2000000',
  homepage: 'https://adanet.io',
  poolId: 'pool1pmvsu5kmy9nt82qwqugcsku5772sls8r3x99ww5tnzcwjzpvy4n',
  ticker: 'ANET',
  description:
    'Energy-optimized Bare Metal Infrastructure | Adoption-focused written / visual guides | MD, US',
  name: 'AdaNet.io',
};

export const transactions = [
  {
    blockHeader: {
      blockNo: 2_701_191,
      hash: 'a5e9f2b7ecd3eee91d8f2c41d2e0d0caa29995a9de007fe13f7866e12ee844fa',
      slot: 70_975_413,
    },
    body: {
      collaterals: [],
      fee: '173157',
      inputs: [
        {
          address:
            'addr_test1qpes9uenlf3kedxxzldrrsly92uczwc0hxf3juq82kkm20hftnqe247ykg7hj7xs5dzfhcdy9j64neqdh9xrn48w5t4qhp8r2l',
          index: 1,
          txId: 'e45a70c8dc06018b53fb0ef0468869b557e49b914bfd0e7b83900e6250892b08',
        },
      ],
      outputs: [
        {
          address:
            'addr_test1qpes9uenlf3kedxxzldrrsly92uczwc0hxf3juq82kkm20hftnqe247ykg7hj7xs5dzfhcdy9j64neqdh9xrn48w5t4qhp8r2l',
          value: { coins: '319561245' },
        },
      ],
      certificates: [
        {
          __typename: 'UnRegistrationCertificate',
          deposit: '2000000',
          stakeCredential: {
            hash: 'e95cc19557c4b23d7978d0a3449be1a42cb559e40db94c39d4eea2ea',
            type: 0,
          },
        },
      ],
      validityInterval: { invalidHereafter: 70_996_971 },
      withdrawals: [
        {
          quantity: '786024',
          stakeAddress:
            'stake_test1ur54esv42lzty0te0rg2x3ymuxjzed2eusxmjnpe6nh296ss4pm07',
        },
      ],
    },
    id: '10ef14668fc15f08212021ccd4e1ec2fc4d160f319e4e9ae67a44de04f77d6b8',
    index: 5,
    inputSource: 'inputs',
    txSize: 399,
    witness: { signatures: {} },
  },
  {
    auxiliaryData: { blob: {} },
    blockHeader: {
      blockNo: 2_698_578,
      hash: '52b39c806741d71bd3001c3ff9ba10422a68db5a3a64e322cb792ab01afa1942',
      slot: 70_904_000,
    },
    body: {
      collaterals: [],
      fee: '179405',
      inputs: [
        {
          address:
            'addr_test1qpes9uenlf3kedxxzldrrsly92uczwc0hxf3juq82kkm20hftnqe247ykg7hj7xs5dzfhcdy9j64neqdh9xrn48w5t4qhp8r2l',
          index: 5,
          txId: 'e45a70c8dc06018b53fb0ef0468869b557e49b914bfd0e7b83900e6250892b08',
        },
      ],
      outputs: [
        {
          address:
            'addr_test1qpes9uenlf3kedxxzldrrsly92uczwc0hxf3juq82kkm20hftnqe247ykg7hj7xs5dzfhcdy9j64neqdh9xrn48w5t4qhp8r2l',
          value: { coins: '37439142' },
        },
      ],
      certificates: [
        {
          __typename: 'RegistrationCertificate',
          deposit: '2000000',
          stakeCredential: {
            hash: 'e95cc19557c4b23d7978d0a3449be1a42cb559e40db94c39d4eea2ea',
            type: 0,
          },
        },
        {
          __typename: 'StakeDelegationCertificate',
          poolId: 'pool129n0d9zrla7ntfjlwhqrtmn7halem0shcjd5mz5zhfym2auyu05',
          stakeCredential: {
            hash: 'e95cc19557c4b23d7978d0a3449be1a42cb559e40db94c39d4eea2ea',
            type: 0,
          },
        },
      ],
      validityInterval: { invalidHereafter: 70_911_116 },
    },
    id: 'e985215bec994c0dbc03056450d7b27bb228929fd07de4ac234002959e5ef3d0',
    index: 4,
    inputSource: 'inputs',
    txSize: 541,
    witness: { signatures: {} },
  },
];

export const txInfo = {
  '10ef14668fc15f08212021ccd4e1ec2fc4d160f319e4e9ae67a44de04f77d6b8': {
    txHash: '10ef14668fc15f08212021ccd4e1ec2fc4d160f319e4e9ae67a44de04f77d6b8',
    fees: '173157',
    deposit: '0',
    refund: '2000000',
    metadata: [],
    date: '2024-09-18T11:23:33.000Z',
    timestamp: '2024-09-18 14:23:33',
    type: 'self',
    extra: ['withdrawal', 'unstake'],
    amounts: [{ unit: 'lovelace', quantity: '2612867' }],
    lovelace: '2786024',
    assets: [
      {
        decimals: 0,
        displayName: 'Djed',
        fingerprint: 'asset1spcamsngdptfa0nr2r48e8720ry4k8mt6me5e4',
        image: null,
        labeledName: 'Djed',
        name: 'Djed',
        policy: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
        quantity: '10999999',
        unit: '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198446a6564',
      },
    ],
  },
  e985215bec994c0dbc03056450d7b27bb228929fd07de4ac234002959e5ef3d0: {
    txHash: 'e985215bec994c0dbc03056450d7b27bb228929fd07de4ac234002959e5ef3d0',
    fees: '179405',
    deposit: '2000000',
    refund: '0',
    metadata: [
      {
        label: '6862',
        json_metadata: [
          {
            pools: [
              [
                {
                  id: '5166f69443ff7d35a65f75c035ee7ebf7f9dbe17c49b4d8a82ba49b5',
                },
                { weight: '1' },
              ],
            ],
          },
        ],
      },
    ],
    date: '2024-09-17T15:33:20.000Z',
    timestamp: '2024-09-17 18:33:20',
    type: 'self',
    extra: ['delegation', 'stake'],
    amounts: [{ unit: 'lovelace', quantity: '-2179405' }],
    lovelace: '0',
    assets: [],
  },
};
