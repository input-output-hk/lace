/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { inspectTxType, getTxDirection } from '../tx-inspection';
import { buildMockTx } from '../mocks/tx';
import { mockConwayCertificates } from '../mocks/certificates';
import { Wallet } from '@lace/cardano';
import { TxDirections } from '@src/types';
import { Cardano } from '@cardano-sdk/core';
import { TransactionActivityType, ActivityType } from '@lace/core';
import * as Core from '@cardano-sdk/core';
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

const createStubInputResolver = (
  walletAddresses: Wallet.KeyManagement.GroupedAddress[]
): Wallet.Cardano.InputResolver => ({
  resolveInput: jest.fn(async (input) => {
    const address = (input as Wallet.Cardano.HydratedTxIn).address;
    return walletAddresses.some((addr) => addr.address === address) ? ({ address } as Wallet.Cardano.TxOut) : null;
  })
});

jest.mock('@cardano-sdk/core', () => ({
  ...jest.requireActual<any>('@cardano-sdk/core'), // eslint-disable-line @typescript-eslint/no-explicit-any
  createTxInspector: jest.fn(jest.requireActual<any>('@cardano-sdk/core').createTxInspector) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

describe('testing tx-inspection utils', () => {
  describe('Testing getTxDirection function', () => {
    test('should return proper direction', () => {
      expect(getTxDirection({ type: TransactionActivityType.incoming })).toEqual(TxDirections.Incoming);
      expect(getTxDirection({ type: TransactionActivityType.rewards })).toEqual(TxDirections.Outgoing);
      expect(getTxDirection({ type: TransactionActivityType.outgoing })).toEqual(TxDirections.Outgoing);
      expect(getTxDirection({ type: TransactionActivityType.self })).toEqual(TxDirections.Self);
    });
  });
  describe('Testing inspectTxType function', () => {
    test('should return incoming', async () => {
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

      const result = await inspectTxType({
        tx: incomingTX,
        inputResolver: { resolveInput: jest.fn().mockResolvedValue(null) },
        walletAddresses: [
          { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
        ] as Wallet.KeyManagement.GroupedAddress[]
      });

      expect(result).toBe('incoming');
    });

    test('should return outgoing', async () => {
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
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: outgoingX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('outgoing');
    });

    test('should return delegation', async () => {
      const delegationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeDelegation,
            stakeCredential: {
              hash: STAKE_KEY_HASH,
              type: Wallet.Cardano.CredentialType.KeyHash
            },
            poolId: POOL_ID
          }
        ]
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: delegationTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('delegation');
    });

    test('should not return delegation', async () => {
      const delegationTX = buildMockTx({
        certificates: []
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: delegationTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).not.toBe('delegation');
    });

    test('should not return delegation in case pool id is missing', async () => {
      const delegationTX = buildMockTx({
        certificates: [{} as Cardano.StakeDelegationCertificate]
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: delegationTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).not.toBe('delegation');
    });

    test('should return delegationRegistration', async () => {
      const stakeKeyRegistrationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeRegistration,
            stakeCredential: {
              hash: STAKE_KEY_HASH,
              type: Wallet.Cardano.CredentialType.KeyHash
            }
          }
        ]
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: stakeKeyRegistrationTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('delegationRegistration');
    });

    test('should return delegationDeregistration', async () => {
      const stakeKeyDeregistrationTX = buildMockTx({
        certificates: [
          {
            __typename: Wallet.Cardano.CertificateType.StakeDeregistration,
            stakeCredential: {
              hash: STAKE_KEY_HASH,
              type: Wallet.Cardano.CredentialType.KeyHash
            }
          }
        ]
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: stakeKeyDeregistrationTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('delegationDeregistration');
    });

    test('is outgoing rewards', async () => {
      const withdrawalTX = buildMockTx({
        withdrawals: [
          {
            stakeAddress: REWARD_ACCOUNT,
            quantity: BigInt(2_000_000)
          }
        ]
      });
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: withdrawalTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('outgoing');
    });

    test('is self rewards', async () => {
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
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: withdrawalTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('self');
    });

    test('is self', async () => {
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
      const walletAddresses = [
        { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: withdrawalTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('self');
    });

    test('is incoming tx with withdrawal and not the wallet stake address', async () => {
      const withdrawalTX = buildMockTx({
        withdrawals: [
          {
            stakeAddress: STAKE_ADDRESS,
            quantity: BigInt(2_000_000)
          }
        ]
      });
      const walletAddresses = [
        { address: ADDRESS_2, rewardAccount: REWARD_ACCOUNT }
      ] as Wallet.KeyManagement.GroupedAddress[];

      const result = await inspectTxType({
        tx: withdrawalTX,
        inputResolver: createStubInputResolver(walletAddresses),
        walletAddresses
      });

      expect(result).toBe('incoming');
    });

    describe('conway era transaction types', () => {
      describe('certificates', () => {
        const conwayCertificates: { cert: Wallet.Cardano.Certificate; expectedReturn: ActivityType }[] = [];

        for (const [certificateType, certificate] of Object.entries(mockConwayCertificates)) {
          conwayCertificates.push({ cert: certificate, expectedReturn: certificateType as ActivityType });
        }

        it.each(conwayCertificates)(
          "should return '$expectedReturn' if a certificate of type $cert.__typename exists in the transaction body",
          async ({ cert, expectedReturn }) => {
            const mockTx = buildMockTx({
              certificates: [cert],
              inputs: [
                {
                  address: ADDRESS_1,
                  ...DEAFULT_TX_INPUT_INFO
                }
              ],
              outputs: [
                {
                  address: ADDRESS_2,
                  ...DEFAULT_OUTPUT_VALUE
                },
                {
                  address: ADDRESS_1,
                  ...DEFAULT_OUTPUT_VALUE
                }
              ]
            });
            const result = await inspectTxType({
              tx: mockTx,
              walletAddresses: [
                { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
              ] as Wallet.KeyManagement.GroupedAddress[],
              inputResolver: { resolveInput: jest.fn().mockResolvedValue(null) }
            });
            expect(result).toEqual(expectedReturn);
          }
        );
      });

      describe('governance actions', () => {
        it('should return "vote" if votingProcedures are present', async () => {
          const createTxInspectorSpy = jest.spyOn(Core, 'createTxInspector').mockReturnValue(
            async () =>
              await ({
                sent: { inputs: [1] },
                delegation: [],
                stakeKeyRegistration: [],
                stakeKeyDeregistration: []
              } as never)
          );

          const mockTx = buildMockTx({
            inputs: [
              {
                address: ADDRESS_1,
                ...DEAFULT_TX_INPUT_INFO
              }
            ],
            outputs: [
              {
                address: ADDRESS_2,
                ...DEFAULT_OUTPUT_VALUE
              },
              {
                address: ADDRESS_1,
                ...DEFAULT_OUTPUT_VALUE
              }
            ]
          });
          const result = await inspectTxType({
            tx: {
              ...mockTx,
              body: {
                ...mockTx.body,
                votingProcedures: [
                  {
                    voter: {
                      __typename: Wallet.Cardano.VoterType.dRepKeyHash,
                      credential: {
                        hash: Wallet.Crypto.Hash28ByteBase16(
                          'c780b43ca9577ea3f28f1fbd39a4d13c3ad9df6987051f5167815974'
                        ),
                        type: Wallet.Cardano.CredentialType.KeyHash
                      }
                    },
                    votes: [
                      {
                        actionId: {
                          actionIndex: 1,
                          id: DEAFULT_TX_INPUT_INFO.txId
                        },
                        votingProcedure: {
                          vote: 1,
                          // eslint-disable-next-line unicorn/no-null
                          anchor: null
                        }
                      }
                    ]
                  }
                ]
              }
            },
            walletAddresses: [
              { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
            ] as Wallet.KeyManagement.GroupedAddress[],
            inputResolver: { resolveInput: jest.fn().mockResolvedValue(null) }
          });

          expect(result).toEqual('vote');
          createTxInspectorSpy.mockRestore();
        });

        it('should return "submitProposal" if proposalProcedures are present', async () => {
          const createTxInspectorSpy = jest.spyOn(Core, 'createTxInspector').mockReturnValue(
            async () =>
              await ({
                sent: { inputs: [1] },
                delegation: [],
                stakeKeyRegistration: [],
                stakeKeyDeregistration: []
              } as never)
          );
          const mockTx = buildMockTx({
            inputs: [
              {
                address: ADDRESS_1,
                ...DEAFULT_TX_INPUT_INFO
              }
            ],
            outputs: [
              {
                address: ADDRESS_2,
                ...DEFAULT_OUTPUT_VALUE
              },
              {
                address: ADDRESS_1,
                ...DEFAULT_OUTPUT_VALUE
              }
            ]
          });
          const result = await inspectTxType({
            tx: {
              ...mockTx,
              body: {
                ...mockTx.body,
                proposalProcedures: [
                  {
                    rewardAccount: REWARD_ACCOUNT,
                    // eslint-disable-next-line unicorn/no-null
                    anchor: null,
                    governanceAction: {
                      __typename: Wallet.Cardano.GovernanceActionType.parameter_change_action
                    } as Wallet.Cardano.GovernanceAction,
                    deposit: BigInt(1)
                  }
                ]
              }
            },
            walletAddresses: [
              { address: ADDRESS_1, rewardAccount: REWARD_ACCOUNT }
            ] as Wallet.KeyManagement.GroupedAddress[],
            inputResolver: { resolveInput: jest.fn().mockResolvedValue(null) }
          });
          expect(result).toEqual('ParameterChangeAction');
          createTxInspectorSpy.mockRestore();
        });
      });
    });
  });
});
