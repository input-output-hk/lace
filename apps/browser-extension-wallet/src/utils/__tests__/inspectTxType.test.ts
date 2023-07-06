/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { inspectTxType, getTxDirection } from '../tx-inspection';
import { buildMockTx } from '../mocks/tx';
import { Wallet } from '@lace/cardano';
import { TxDirections } from '@src/types';
import { StakeDelegationCertificate } from '@cardano-sdk/core/dist/cjs/Cardano';

const ADDRESS_1 = Wallet.Cardano.PaymentAddress(
  'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
);

const ADDRESS_2 = Wallet.Cardano.PaymentAddress(
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
);

const REWARD_ACCOUNT = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const STAKE_ADDRESS = Wallet.Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx');

const DEFAULT_OUTPUT_VALUE = { value: { coins: BigInt(2_000_000) } };

const DEAFULT_TX_INPUT_INFO = {
  index: 0,
  txId: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
};

const POOL_ID = Wallet.Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');

const STAKE_KEY_HASH = Wallet.Cardano.RewardAccount.toHash(REWARD_ACCOUNT);
describe('testing tx-inspection utils', () => {
  describe('Testing getTxDirection function', () => {
    test('should return proper direction', () => {
      expect(getTxDirection({ type: 'incoming' })).toEqual(TxDirections.Incoming);
      expect(getTxDirection({ type: 'rewards' })).toEqual(TxDirections.Outgoing);
      expect(getTxDirection({ type: 'outgoing' })).toEqual(TxDirections.Outgoing);
      expect(getTxDirection({ type: 'self-rewards' })).toEqual(TxDirections.Self);
      expect(getTxDirection({ type: 'self' })).toEqual(TxDirections.Self);
    });
  });
  describe('Testing inspectTxType function', () => {
    test('should return incoming', () => {
      const incomingTX = buildMockTx({
        inputs: [
          {
            address: ADDRESS_2,
            ...DEAFULT_TX_INPUT_INFO
          }
        ],
        outputs: [
          {
            address: ADDRESS_1,
            ...DEFAULT_OUTPUT_VALUE
          },
          {
            address: ADDRESS_2,
            ...DEFAULT_OUTPUT_VALUE
          }
        ]
      });

      const result = inspectTxType({
        tx: incomingTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('incoming');
    });

    test('should return outgoing', () => {
      const outgoingX = buildMockTx({
        inputs: [
          {
            address: ADDRESS_1,
            ...DEAFULT_TX_INPUT_INFO
          }
        ],
        outputs: [
          {
            address: ADDRESS_1,
            ...DEFAULT_OUTPUT_VALUE
          },
          {
            address: ADDRESS_2,
            ...DEFAULT_OUTPUT_VALUE
          }
        ]
      });

      const result = inspectTxType({
        tx: outgoingX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('outgoing');
    });

    test('should return delegation', () => {
      const delegationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeDelegation,
            stakeKeyHash: STAKE_KEY_HASH,
            poolId: POOL_ID
          }
        ]
      });

      const result = inspectTxType({
        tx: delegationTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('delegation');
    });

    test('should not return delegation', () => {
      const delegationTX = buildMockTx({
        certificates: []
      });

      const result = inspectTxType({
        tx: delegationTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).not.toBe('delegation');
    });

    test('should not return delegation in case pool id is missing', () => {
      const delegationTX = buildMockTx({
        certificates: [{} as StakeDelegationCertificate]
      });

      const result = inspectTxType({
        tx: delegationTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).not.toBe('delegation');
    });

    test('should return delegationRegistration', () => {
      const stakeKeyRegistrationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeKeyRegistration,
            stakeKeyHash: STAKE_KEY_HASH
          }
        ]
      });

      const result = inspectTxType({
        tx: stakeKeyRegistrationTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('delegationRegistration');
    });

    test('should return delegationDeregistration', () => {
      const stakeKeyDeregistrationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeKeyDeregistration,
            stakeKeyHash: STAKE_KEY_HASH
          }
        ]
      });

      const result = inspectTxType({
        tx: stakeKeyDeregistrationTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('delegationDeregistration');
    });

    test('is outgoing rewards', () => {
      const withdrawalTX = buildMockTx({
        withdrawals: [
          {
            stakeAddress: REWARD_ACCOUNT,
            quantity: BigInt(2_000_000)
          }
        ]
      });

      const result = inspectTxType({
        tx: withdrawalTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('rewards');
    });

    test('is incoming rewards', () => {
      const withdrawalTX = buildMockTx({
        withdrawals: [
          {
            stakeAddress: REWARD_ACCOUNT,
            quantity: BigInt(2_000_000)
          }
        ]
      });

      const result = inspectTxType({
        tx: withdrawalTX,
        walletAddresses: [
          { address: ADDRESS_2, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('rewards');
    });

    test('is self rewards', () => {
      const withdrawalTX = buildMockTx({
        inputs: [
          {
            address: ADDRESS_1,
            ...DEAFULT_TX_INPUT_INFO
          }
        ],
        outputs: [
          {
            address: ADDRESS_1,
            ...DEFAULT_OUTPUT_VALUE
          }
        ],
        withdrawals: [
          {
            stakeAddress: REWARD_ACCOUNT,
            quantity: BigInt(2_000_000)
          }
        ]
      });

      const result = inspectTxType({
        tx: withdrawalTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('self-rewards');
    });

    test('is self', () => {
      const withdrawalTX = buildMockTx({
        inputs: [
          {
            address: ADDRESS_1,
            ...DEAFULT_TX_INPUT_INFO
          }
        ],
        outputs: [
          {
            address: ADDRESS_1,
            ...DEFAULT_OUTPUT_VALUE
          }
        ]
      });

      const result = inspectTxType({
        tx: withdrawalTX,
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('self');
    });

    test('is incoming tx with withdrawal and not the wallet stake address', () => {
      const withdrawalTX = buildMockTx({
        withdrawals: [
          {
            stakeAddress: STAKE_ADDRESS,
            quantity: BigInt(2_000_000)
          }
        ]
      });

      const result = inspectTxType({
        tx: withdrawalTX,
        walletAddresses: [
          { address: ADDRESS_2, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('incoming');
    });
  });
});
