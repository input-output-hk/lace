/**
 * Contrarian probe: does the WIDENED network-binding walk
 * -- the recursion into `body.subTransactions` and the read of the payout
 * `rewardAccount`s inside a `treasury_withdrawals_action` -- refuse governance
 * or multi-part transactions a real dApp legitimately sends?
 *
 * A guard fails in two directions. Everyone tests the loose one. This file
 * tests the tight one: FALSE REFUSALS. Every `expect(...).toBe(true)` here is a
 * shape that must keep signing; every `toBe(false)` on a legitimate shape is a
 * FINDING, and where one exists the green test pins the current behaviour so
 * the finding is a fact and not an opinion. Read the per-case comments: the
 * file passing does NOT mean "nothing found".
 *
 * The regression matrix at the bottom re-implements the PRE-widening walk
 * verbatim from `git diff` and diffs its verdict against the shipped one over
 * every shape built here. A shape the old walk accepted and the new one refuses
 * is a regression even if the new reading is "more correct".
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { networkBindingRefusal } from '../src/common/store/utils/network-binding';

import {
  isBoundToNetwork,
  isCborBoundToNetwork,
} from './support/network-binding-verdict';

import type { NetworkBindingRefusal } from '../src/common/store/utils/network-binding';

const TESTNET = Cardano.NetworkId.Testnet;
const MAINNET = Cardano.NetworkId.Mainnet;

const inputs = [
  { txId: Cardano.TransactionId('a'.repeat(64)), index: 0 },
] as Cardano.TxIn[];

/** A reward account of the given network and credential kind. */
const rewardAccount = (
  networkId: Cardano.NetworkId,
  type: Cardano.CredentialType,
  hashHex: string,
): Cardano.RewardAccount =>
  Cardano.RewardAddress.fromCredentials(networkId, {
    hash: Hash28ByteBase16(hashHex),
    type,
  })
    .toAddress()
    .toBech32() as unknown as Cardano.RewardAccount;

const TESTNET_KEY_REWARD = rewardAccount(
  TESTNET,
  Cardano.CredentialType.KeyHash,
  '1'.repeat(56),
);
const TESTNET_KEY_REWARD_2 = rewardAccount(
  TESTNET,
  Cardano.CredentialType.KeyHash,
  '2'.repeat(56),
);
const TESTNET_SCRIPT_REWARD = rewardAccount(
  TESTNET,
  Cardano.CredentialType.ScriptHash,
  '3'.repeat(56),
);
const MAINNET_KEY_REWARD = rewardAccount(
  MAINNET,
  Cardano.CredentialType.KeyHash,
  '4'.repeat(56),
);

const TESTNET_ADDRESS = Cardano.EnterpriseAddress.fromCredentials(TESTNET, {
  hash: Hash28ByteBase16('5'.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
})
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const testnetOutput = {
  address: TESTNET_ADDRESS,
  value: { coins: 2_000_000n },
} as Cardano.TxOut;

const anchor = {
  url: 'https://example.com/proposal.json',
  dataHash: Hash32ByteBase16('9'.repeat(64)),
};

const body = (fields: Partial<Cardano.TxBody>): Cardano.TxBody =>
  ({ inputs, outputs: [], fee: 180_000n, ...fields } as Cardano.TxBody);

const proposal = (
  governanceAction: Cardano.GovernanceAction,
  depositReturn: Cardano.RewardAccount = TESTNET_KEY_REWARD,
): Cardano.ProposalProcedure => ({
  anchor,
  deposit: 100_000_000_000n,
  governanceAction,
  rewardAccount: depositReturn,
});

const treasuryAction = (
  payouts: Cardano.RewardAccount[],
): Cardano.GovernanceAction => ({
  __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
  policyHash: null,
  withdrawals: new Set(
    payouts.map(account => ({ coin: 1_000_000n, rewardAccount: account })),
  ),
});

/**
 * Round-trips a body through the wire format the signing paths actually see,
 * so no verdict below can be dismissed as "that core object never exists".
 */
const toCbor = (txBody: Cardano.TxBody): string =>
  Serialization.Transaction.fromCore({
    body: txBody,
    id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
    witness: { signatures: new Map() },
  } as Cardano.Tx).toCbor();

/** Every shape this file builds, for the regression matrix at the bottom. */
const catalogue: { shape: string; body: Cardano.TxBody }[] = [];
const record = (shape: string, txBody: Cardano.TxBody): Cardano.TxBody => {
  catalogue.push({ shape, body: txBody });
  return txBody;
};

// ---------------------------------------------------------------------------
// 1. Treasury withdrawals on the network the wallet is on.
// ---------------------------------------------------------------------------

describe('treasury_withdrawals_action on the wallet’s own network', () => {
  it('accepts a proposal whose payout accounts are ordinary key-hash accounts', () => {
    const txBody = record(
      'treasury withdrawals, key-hash payouts',
      body({
        proposalProcedures: [
          proposal(treasuryAction([TESTNET_KEY_REWARD, TESTNET_KEY_REWARD_2])),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('survives the CBOR round trip the signing paths actually take', () => {
    const cbor = toCbor(
      body({
        outputs: [testnetOutput],
        proposalProcedures: [
          proposal(treasuryAction([TESTNET_KEY_REWARD, TESTNET_KEY_REWARD_2])),
        ],
      }),
    );
    const decoded = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).toCore().body;

    // The SDK models the payouts as a Set of objects on the way out, whatever
    // it used on the way in; a walk that assumed a Map or an array would read
    // `undefined` here and answer 'unreadable'.
    const action = decoded.proposalProcedures![0]
      .governanceAction as Cardano.TreasuryWithdrawalsAction;
    expect(action.withdrawals).toBeInstanceOf(Set);
    expect([...action.withdrawals].map(w => w.rewardAccount).sort()).toEqual(
      [TESTNET_KEY_REWARD, TESTNET_KEY_REWARD_2].sort(),
    );
    expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
  });

  it('accepts a SCRIPT reward account as a payout target', () => {
    const txBody = record(
      'treasury withdrawals, script-hash payout',
      body({
        proposalProcedures: [proposal(treasuryAction([TESTNET_SCRIPT_REWARD]))],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('accepts a SCRIPT reward account as the proposal deposit-return account', () => {
    const txBody = record(
      'proposal deposit returns to a script account',
      body({
        proposalProcedures: [
          proposal(treasuryAction([TESTNET_KEY_REWARD]), TESTNET_SCRIPT_REWARD),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('accepts a proposal with an EMPTY withdrawals set (deposit account still speaks)', () => {
    const txBody = record(
      'treasury withdrawals, empty set',
      body({ proposalProcedures: [proposal(treasuryAction([]))] }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('refuses a payout to the OTHER network -- the security win, not a false refusal', () => {
    const txBody = body({
      outputs: [testnetOutput],
      proposalProcedures: [
        proposal(treasuryAction([TESTNET_KEY_REWARD, MAINNET_KEY_REWARD])),
      ],
    });
    expect(networkBindingRefusal(txBody, TESTNET)).toBe('states-other-network');
  });
});

// ---------------------------------------------------------------------------
// 2. The other six governance action kinds.
// ---------------------------------------------------------------------------

const otherActions: { kind: string; action: Cardano.GovernanceAction }[] = [
  {
    action: {
      __typename: Cardano.GovernanceActionType.parameter_change_action,
      governanceActionId: null,
      policyHash: null,
      protocolParamUpdate: { minFeeCoefficient: 45 },
    },
    kind: 'parameter_change_action',
  },
  {
    action: {
      __typename: Cardano.GovernanceActionType.hard_fork_initiation_action,
      governanceActionId: null,
      protocolVersion: { major: 10, minor: 0 },
    },
    kind: 'hard_fork_initiation_action',
  },
  {
    action: {
      __typename: Cardano.GovernanceActionType.no_confidence,
      governanceActionId: null,
    },
    kind: 'no_confidence',
  },
  {
    action: {
      __typename: Cardano.GovernanceActionType.update_committee,
      governanceActionId: null,
      membersToBeAdded: new Set(),
      membersToBeRemoved: new Set([
        {
          hash: Hash28ByteBase16('7'.repeat(56)),
          type: Cardano.CredentialType.KeyHash,
        },
      ]),
      newQuorumThreshold: { denominator: 3, numerator: 2 },
    },
    kind: 'update_committee',
  },
  {
    action: {
      __typename: Cardano.GovernanceActionType.new_constitution,
      constitution: { anchor, scriptHash: null },
      governanceActionId: null,
    },
    kind: 'new_constitution',
  },
  {
    action: { __typename: Cardano.GovernanceActionType.info_action },
    kind: 'info_action',
  },
];

describe('the other six governance action kinds', () => {
  it.each(otherActions)(
    'accepts a bare $kind proposal on the wallet’s network',
    ({ action, kind }) => {
      const txBody = record(
        `bare ${kind} proposal`,
        body({ proposalProcedures: [proposal(action)] }),
      );
      expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
    },
  );

  it('a bare info_action proposal rests ENTIRELY on the deposit-return account', () => {
    // FINDING (pinned, not a regression): none of these six actions carries an
    // address of its own, so the only evidence a proposal-only body offers is
    // the deposit-return account. It is mandatory in the CDDL, so the shape
    // always has exactly one witness -- but it also means a single mis-decoded
    // reward account flips the whole transaction to a refusal, with no second
    // element to corroborate it. Mutating that one account to the other network
    // is enough to refuse a proposal that is otherwise entirely local.
    const local = body({
      proposalProcedures: [
        proposal({ __typename: Cardano.GovernanceActionType.info_action }),
      ],
    });
    expect(networkBindingRefusal(local, TESTNET)).toBeNull();

    const onlyEvidenceFlipped = body({
      proposalProcedures: [
        proposal(
          { __typename: Cardano.GovernanceActionType.info_action },
          MAINNET_KEY_REWARD,
        ),
      ],
    });
    expect(networkBindingRefusal(onlyEvidenceFlipped, TESTNET)).toBe(
      'states-other-network',
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Multi-part transactions (`body.subTransactions`).
// ---------------------------------------------------------------------------

const subTransaction = (
  subBody: Partial<Cardano.SubTransactionBody>,
): Cardano.SubTransaction =>
  ({
    body: { inputs, outputs: [], ...subBody },
    witness: { signatures: new Map() },
  } as unknown as Cardano.SubTransaction);

describe('multi-part transactions', () => {
  it('accepts a same-network sub transaction under a same-network parent', () => {
    const txBody = record(
      'parent + sub, both testnet',
      body({
        outputs: [testnetOutput],
        subTransactions: [subTransaction({ outputs: [testnetOutput] })],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('accepts a sub transaction that carries NO network-bearing element of its own', () => {
    const txBody = record(
      'parent speaks, sub silent',
      body({
        outputs: [testnetOutput],
        subTransactions: [
          subTransaction({
            certificates: [
              {
                __typename: Cardano.CertificateType.StakeDelegation,
                poolId: Cardano.PoolId(
                  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
                ),
                stakeCredential: {
                  hash: Hash28ByteBase16('8'.repeat(56)),
                  type: Cardano.CredentialType.KeyHash,
                },
              } as Cardano.Certificate,
            ],
          }),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('accepts a SILENT parent whose only evidence lives in the sub transaction', () => {
    const txBody = record(
      'parent silent, sub speaks',
      body({
        subTransactions: [subTransaction({ outputs: [testnetOutput] })],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('accepts a sub transaction whose evidence is a withdrawal, not an output', () => {
    const txBody = record(
      'sub withdraws to a testnet reward account',
      body({
        outputs: [testnetOutput],
        subTransactions: [
          subTransaction({
            withdrawals: [
              { quantity: 1_000_000n, stakeAddress: TESTNET_KEY_REWARD },
            ],
          }),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('refuses a cross-network sub transaction under a same-network parent', () => {
    const txBody = body({
      outputs: [testnetOutput],
      subTransactions: [
        subTransaction({
          withdrawals: [
            { quantity: 1_000_000n, stakeAddress: MAINNET_KEY_REWARD },
          ],
        }),
      ],
    });
    expect(networkBindingRefusal(txBody, TESTNET)).toBe('states-other-network');
  });

  it('refuses a parent AND sub that are both silent', () => {
    const txBody = record(
      'parent and sub both silent',
      body({ subTransactions: [subTransaction({})] }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBe('states-no-network');
  });

  describe('over the wire format the signing paths actually receive', () => {
    const decodedSubBodies = (cbor: string) =>
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).toCore()
        .body.subTransactions;

    it('round-trips a parent + same-network sub and accepts it', () => {
      const cbor = toCbor(
        body({
          outputs: [testnetOutput],
          subTransactions: [subTransaction({ outputs: [testnetOutput] })],
        }),
      );
      expect(decodedSubBodies(cbor)).toHaveLength(1);
      expect(decodedSubBodies(cbor)![0].body.outputs).toHaveLength(1);
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
    });

    it('round-trips a silent parent whose evidence is only in the sub, and accepts it', () => {
      const cbor = toCbor(
        body({
          subTransactions: [subTransaction({ outputs: [testnetOutput] })],
        }),
      );
      expect(
        Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).toCore()
          .body.outputs,
      ).toHaveLength(0);
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
    });

    it('round-trips a cross-network sub and refuses it', () => {
      const cbor = toCbor(
        body({
          outputs: [testnetOutput],
          subTransactions: [
            subTransaction({
              withdrawals: [
                { quantity: 1_000_000n, stakeAddress: MAINNET_KEY_REWARD },
              ],
            }),
          ],
        }),
      );
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(false);
    });

    it('round-trips a treasury proposal nested in a sub and accepts it', () => {
      const cbor = toCbor(
        body({
          outputs: [testnetOutput],
          subTransactions: [
            subTransaction({
              proposalProcedures: [
                proposal(treasuryAction([TESTNET_KEY_REWARD])),
              ],
            }),
          ],
        }),
      );
      const action = decodedSubBodies(cbor)![0].body.proposalProcedures![0]
        .governanceAction as Cardano.TreasuryWithdrawalsAction;
      expect([...action.withdrawals]).toHaveLength(1);
      expect(isCborBoundToNetwork(cbor, TESTNET)).toBe(true);
    });
  });

  it('reads a treasury proposal nested inside a sub transaction', () => {
    const txBody = record(
      'sub carries a treasury proposal',
      body({
        outputs: [testnetOutput],
        subTransactions: [
          subTransaction({
            proposalProcedures: [
              proposal(treasuryAction([TESTNET_KEY_REWARD])),
            ],
          }),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. The only route by which the widening could tighten a verdict.
//
// Adding evidence can only move a body from 'states-no-network' towards a
// decision, or from ACCEPT to 'states-other-network'. The second is the false
// refusal, and it fires on exactly two kinds of new evidence: an element that
// genuinely names the other network, and one the address parser cannot read
// ('unreadable'). These cases bound the second kind.
// ---------------------------------------------------------------------------

const byronAddress = (magic: number | undefined): Cardano.PaymentAddress =>
  Cardano.ByronAddress.fromCredentials(
    Hash28ByteBase16('f'.repeat(56)),
    magic === undefined ? {} : { magic },
    Cardano.ByronAddressType.PubKey,
  )
    .toAddress()
    .toBase58() as unknown as Cardano.PaymentAddress;

describe('the unreadable arm, and legacy addresses inside a sub transaction', () => {
  it('accepts a Byron output in a sub transaction when it carries the testnet magic', () => {
    const txBody = record(
      'sub pays a Byron address with testnet magic',
      body({
        outputs: [testnetOutput],
        subTransactions: [
          subTransaction({
            outputs: [
              { address: byronAddress(42), value: { coins: 2_000_000n } },
            ] as Cardano.TxOut[],
          }),
        ],
      }),
    );
    expect(networkBindingRefusal(txBody, TESTNET)).toBeNull();
  });

  it('refuses a magic-less Byron output in a sub transaction on testnet -- correctly', () => {
    // Not a false refusal: a Byron address with no protocol-magic attribute IS
    // a mainnet address, and paying one from a testnet transaction is the very
    // cross-network mix the rule exists to catch. Pinned so a future "fix"
    // that makes Byron silent cannot be mistaken for a bug fix.
    const txBody = body({
      outputs: [testnetOutput],
      subTransactions: [
        subTransaction({
          outputs: [
            { address: byronAddress(undefined), value: { coins: 2_000_000n } },
          ] as Cardano.TxOut[],
        }),
      ],
    });
    expect(networkBindingRefusal(txBody, TESTNET)).toBe('states-other-network');
  });

  it('an unreadable treasury payout flips ACCEPT to a refusal -- but cannot reach the wire', () => {
    const unreadablePayout = body({
      outputs: [testnetOutput],
      proposalProcedures: [
        proposal({
          __typename: Cardano.GovernanceActionType.treasury_withdrawals_action,
          policyHash: null,
          withdrawals: new Set([
            {
              coin: 1_000_000n,
              rewardAccount: 'not-an-address' as Cardano.RewardAccount,
            },
          ]),
        }),
      ],
    });
    // The walk answers 'unreadable' for it, which is never equal to the active
    // network, so an otherwise-fine testnet body is refused — and, since the
    // only readable element names THIS network, it is refused as an unreadable
    // element rather than as a conflict nobody observed...
    expect(networkBindingRefusal(unreadablePayout, TESTNET)).toBe(
      'states-unreadable-element',
    );
    // ...but the same shape cannot be serialized, so no dApp can send it and
    // no decoder can produce it. The unreadable arm is unreachable for the
    // treasury payouts this change added, which is why the widening has no
    // false-refusal route of its own.
    expect(() => toCbor(unreadablePayout)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Regression matrix: pre-widening walk vs shipped walk.
// ---------------------------------------------------------------------------

/**
 * The walk exactly as it stood before this change, lifted from `git diff` of
 * `src/common/store/utils/network-binding.ts`. Its only purpose is to answer
 * "did the widening turn a signable transaction into a refusal?" -- a question
 * the shipped code cannot answer about itself.
 */
const priorRefusal = (
  txBody: Cardano.TxBody,
  networkId: Cardano.NetworkId,
): NetworkBindingRefusal | null => {
  const evidenceOfAddress = (
    address: string,
  ): Cardano.NetworkId | 'unreadable' => {
    const stated = Cardano.Address.fromString(address)?.getNetworkId();
    return stated === undefined ? 'unreadable' : stated;
  };

  const evidence: (Cardano.NetworkId | 'unreadable')[] = [];
  if (txBody.networkId !== undefined) evidence.push(txBody.networkId);
  for (const output of txBody.outputs)
    evidence.push(evidenceOfAddress(output.address));
  if (txBody.collateralReturn)
    evidence.push(evidenceOfAddress(txBody.collateralReturn.address));
  for (const withdrawal of [
    ...(txBody.withdrawals ?? []),
    ...(txBody.directDeposits ?? []),
  ])
    evidence.push(evidenceOfAddress(withdrawal.stakeAddress));
  for (const procedure of txBody.proposalProcedures ?? [])
    evidence.push(evidenceOfAddress(procedure.rewardAccount));
  for (const certificate of txBody.certificates ?? []) {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      continue;
    const { owners, rewardAccount: poolReward } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(poolReward));
    for (const owner of owners) evidence.push(evidenceOfAddress(owner));
  }

  if (evidence.length === 0) return 'states-no-network';
  if (!evidence.every(stated => stated === networkId))
    return 'states-other-network';
  return null;
};

describe('regression matrix -- the widening never turned accept into refuse', () => {
  it('prints the per-shape before/after verdict', () => {
    const rows = catalogue.map(({ body: txBody, shape }) => ({
      after: networkBindingRefusal(txBody, TESTNET) ?? 'ACCEPT',
      before: priorRefusal(txBody, TESTNET) ?? 'ACCEPT',
      shape,
    }));
    // eslint-disable-next-line no-console
    console.table(rows);
    expect(rows.length).toBeGreaterThan(10);
  });

  it('no shape regressed from ACCEPT to a refusal', () => {
    const regressions = catalogue
      .filter(
        ({ body: txBody }) =>
          priorRefusal(txBody, TESTNET) === null &&
          networkBindingRefusal(txBody, TESTNET) !== null,
      )
      .map(({ shape }) => shape);
    expect(regressions).toEqual([]);
  });

  it('the widening only ever RELAXED a verdict (silent parent, speaking sub)', () => {
    const relaxed = catalogue
      .filter(
        ({ body: txBody }) =>
          priorRefusal(txBody, TESTNET) !== null &&
          networkBindingRefusal(txBody, TESTNET) === null,
      )
      .map(({ shape }) => shape);
    expect(relaxed).toEqual(['parent silent, sub speaks']);
  });

  // The bound on what this change could possibly have broken: the widening
  // reads only `subTransactions` and a `treasury_withdrawals_action`, so on any
  // body carrying neither it must be verdict-identical to the walk it replaced.
  // 14 real, chain-shaped transactions from the hw-ledger corpus say it is.
  describe('real transactions carrying neither new field are unaffected', () => {
    const CORPUS = fileURLToPath(
      new URL('../../../next/hw-ledger/test/corpus/fixtures/', import.meta.url),
    );
    const fixtures = (
      JSON.parse(readFileSync(`${CORPUS}index.json`, 'utf8')) as {
        fixtures: { file: string }[];
      }
    ).fixtures.map(({ file }) => {
      const fixture = JSON.parse(readFileSync(`${CORPUS}${file}`, 'utf8')) as {
        context: { chainId: { networkId: number } };
        serializedTxCbor: string;
      };
      return {
        decoded: Serialization.Transaction.fromCbor(
          Serialization.TxCBOR(fixture.serializedTxCbor),
        ).toCore().body,
        file,
        networkId: fixture.context.chainId.networkId as Cardano.NetworkId,
      };
    });

    it('the corpus really is the control group (no sub transactions, no treasury action)', () => {
      expect(fixtures).toHaveLength(14);
      for (const { decoded, file } of fixtures) {
        expect({ file, subs: decoded.subTransactions }).toEqual({
          file,
          subs: undefined,
        });
        for (const procedure of decoded.proposalProcedures ?? [])
          expect(procedure.governanceAction.__typename).not.toBe(
            Cardano.GovernanceActionType.treasury_withdrawals_action,
          );
      }
    });

    it.each(fixtures)(
      '$file: the widened walk returns the same verdict as the walk it replaced',
      ({ decoded, networkId }) => {
        expect(networkBindingRefusal(decoded, networkId)).toBe(
          priorRefusal(decoded, networkId),
        );
      },
    );
  });

  it('isBoundToNetwork agrees with networkBindingRefusal over the whole catalogue', () => {
    for (const { body: txBody, shape } of catalogue)
      expect(
        { bound: isBoundToNetwork(txBody, TESTNET), shape },
        shape,
      ).toEqual({
        bound: networkBindingRefusal(txBody, TESTNET) === null,
        shape,
      });
  });
});
