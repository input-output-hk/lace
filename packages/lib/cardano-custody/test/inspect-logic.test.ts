import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  addCustodyDevice,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  removeCustodyDevice,
  revokeCustodyGrant,
} from '../src';
import { diffCustodyStates } from '../src/analysis/state-change';

import {
  account,
  buildTransaction,
  controlOutput,
  creation,
  device,
  deviceRewrite,
  embedded,
  fund,
  fundOutput,
  grantIssue,
  grantSpend,
  grantSweep,
  identity,
  LOGIC,
  LOGIC_REWARD_ACCOUNT,
  logicRun,
  PARKED_LOGIC,
  PARKED_PROXY,
  PARKED_SCRIPTS,
  payout,
  POOL_ID,
  SPONSOR_ADDRESS,
  sponsorFee,
  STAKE_CREDENTIAL,
  STRANGER_ADDRESS,
  UNKNOWN_LOGIC,
  utxo,
} from './custody-transactions';
import {
  fixtureGrants,
  grantedState,
  initialState,
  LOGIC_HASH,
  OTHER_DEVICE_KEY,
  TOKEN_NAME,
  TOKEN_POLICY,
} from './fixtures';
import {
  accepted,
  grantOf,
  inspect,
  inspectBuilt,
  onlyAccount,
  reasonsOf,
  REFERENCE_SCRIPT,
  refusalsOf,
  transition,
} from './inspect-helpers';

import type { CustodyAccountState } from '../src';
import type { TransactionShape } from './custody-transactions';
import type { CustodyInspectionOptions } from '../src/analysis/inspect';

const GRANT_SPEND = {
  allowGrantSpend: true,
  deviceKeyHash: undefined,
} as const satisfies Partial<CustodyInspectionOptions>;

const [lovelaceGrant] = fixtureGrants;
const TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${TOKEN_NAME}`);

const scriptCredential = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: Hash28ByteBase16(hash),
});

/** The withdrawal that would run the unreviewed logic. */
const unknownLogicRun = (quantity = 0n): Cardano.Withdrawal => ({
  stakeAddress: Cardano.RewardAccount.fromCredential(
    scriptCredential(UNKNOWN_LOGIC),
    Cardano.NetworkId.Testnet,
  ),
  quantity,
});

const control = utxo(0x10, controlOutput(grantedState));
const funds = utxo(0x11, fundOutput(10_000_000n));

const delegation: Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeDelegation,
  stakeCredential: STAKE_CREDENTIAL,
  poolId: POOL_ID,
};

/** A sponsored owner spend of 3 tADA to the stranger from a 10 tADA fund UTxO. */
const ownerSpend = (): TransactionShape => ({
  ...deviceRewrite(grantedState, grantedState),
  inputs: [control, funds, sponsorFee],
  spendRedeemers: [device(control), fund(funds)],
  outputs: [
    controlOutput(grantedState),
    payout(3_000_000n),
    fundOutput(7_000_000n),
    payout(4_800_000n, SPONSOR_ADDRESS),
  ],
});

const FEE = 200_000n;

/**
 * An owner operation the account pays for alone: the control UTxO pays the
 * fee and the sponsor lends only its collateral. `controlLovelace` is what
 * the control output keeps.
 */
const accountPaid = (
  controlLovelace: bigint,
  changes: Partial<TransactionShape> = {},
): TransactionShape => ({
  ...deviceRewrite(grantedState, grantedState),
  inputs: [control],
  outputs: [controlOutput(grantedState, controlLovelace)],
  fee: FEE,
  ...changes,
});

const DRAW = 500_000n;

/** The transaction CBOR with one byte sequence of its body replaced. */
const patchedBody = (
  shape: TransactionShape,
  from: string,
  to: string,
): ReturnType<typeof buildTransaction> => {
  const built = buildTransaction(shape);
  const cbor = built.transaction.toCbor();
  expect(cbor.split(from)).toHaveLength(2);
  return {
    ...built,
    transaction: Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor.replace(from, to)),
    ),
  };
};

/** CBOR of the withdrawal map entry `rewardAccount: 0`. */
const zeroWithdrawalEntry = (rewardAccount: Cardano.RewardAccount): string =>
  `581d${Cardano.Address.fromBech32(rewardAccount).toBytes()}00`;

describe('inspectCustodyTransaction on revision 3', () => {
  describe('accepts what Lace builds', () => {
    const replacedState = { ...grantedState, revoked: [1n] };
    const operations: [
      string,
      () => TransactionShape,
      Partial<CustodyInspectionOptions>,
      unknown[],
    ][] = [
      ['a creation', () => creation(initialState), {}, [{ kind: 'create' }]],
      [
        'an added device',
        () =>
          deviceRewrite(
            initialState,
            transition(addCustodyDevice(initialState, OTHER_DEVICE_KEY, [])),
          ),
        {},
        [{ kind: 'add-device', device: OTHER_DEVICE_KEY }],
      ],
      [
        'a removed device',
        () => {
          const before = {
            ...grantedState,
            devices: [...grantedState.devices, OTHER_DEVICE_KEY],
          };
          return deviceRewrite(
            before,
            transition(removeCustodyDevice(before, OTHER_DEVICE_KEY)),
          );
        },
        {},
        [{ kind: 'remove-device', device: OTHER_DEVICE_KEY }],
      ],
      [
        'an issued grant',
        () => grantIssue(grantedState, [grantOf({ slot: 3n })]),
        {},
        [{ kind: 'issue-grant', slot: 3n }],
      ],
      [
        'a revoked grant',
        () =>
          deviceRewrite(
            grantedState,
            transition(revokeCustodyGrant(grantedState, 1n, fixtureGrants)),
          ),
        {},
        [{ kind: 'revoke-grant', slot: 1n }],
      ],
      [
        'a replaced grant',
        () =>
          grantIssue(grantedState, [grantOf({ slot: 3n })], {
            ...replacedState,
            nextSlot: 4n,
            outstanding: 4n,
          }),
        {},
        [{ kind: 'replace-grant', slot: 1n, issuedSlot: 3n }],
      ],
      [
        'a swept grant',
        () => grantSweep({ ...grantedState, revoked: [0n] }, [lovelaceGrant]),
        {},
        [{ kind: 'sweep-grants', slots: [0n] }],
      ],
      ['an owner spend', ownerSpend, {}, [{ kind: 'owner-spend' }]],
      [
        'a delegation',
        () => ({
          ...deviceRewrite(grantedState, grantedState),
          certificates: [delegation],
        }),
        {},
        [{ kind: 'delegate', poolId: POOL_ID }],
      ],
      [
        'a reward withdrawal beside the logic run',
        () => {
          const rewrite = deviceRewrite(grantedState, grantedState);
          return {
            ...rewrite,
            withdrawals: [
              { stakeAddress: identity.rewardAccount, quantity: 5_000_000n },
            ],
            outputs: [...rewrite.outputs, fundOutput(5_000_000n)],
          };
        },
        {},
        [{ kind: 'withdraw-rewards', quantity: 5_000_000n }],
      ],
      [
        'a grant spend',
        () => grantSpend(grantedState, lovelaceGrant),
        GRANT_SPEND,
        [{ kind: 'grant-spend', slot: 0n }],
      ],
    ];

    describe.each([
      [
        'with the proxy and the logic referenced',
        (shape: TransactionShape) => shape,
      ],
      ['with the proxy and the logic attached', embedded],
    ])('%s', (_, form) => {
      it.each(
        operations.map(([name, shapeOf, options, expected]) => ({
          name,
          shapeOf,
          options,
          expected,
        })),
      )('reads $name', ({ shapeOf, options, expected }) => {
        const report = onlyAccount(accepted(inspect(form(shapeOf()), options)));
        expect(report.operations).toEqual(expected);
        expect(report.logicDraw).toBeUndefined();
      });
    });

    it('keeps the logic run apart from the account reward withdrawal', () => {
      const report = onlyAccount(
        accepted(inspect(deviceRewrite(grantedState, grantedState))),
      );
      expect(report.withdrawal).toBeUndefined();
      expect(report.certificates).toEqual([]);
      expect(report.operations).toEqual([]);
    });

    it('reads a deposit, which runs no logic', () => {
      const inspection = accepted(
        inspect(
          {
            inputs: [sponsorFee],
            outputs: [
              fundOutput(3_000_000n),
              payout(1_800_000n, SPONSOR_ADDRESS),
            ],
          },
          { accountRecord: undefined },
        ),
      );
      expect(inspection.accounts).toEqual([]);
      expect(inspection.deposits).toMatchObject([
        { outputIndex: 0, ...account },
      ]);
    });

    it('accepts a reference input that carries no script', () => {
      const rewrite = deviceRewrite(grantedState, grantedState);
      expect(
        inspect({
          ...rewrite,
          referenceInputs: [
            ...PARKED_SCRIPTS,
            utxo(0x30, payout(1_000_000n, SPONSOR_ADDRESS)),
          ],
        }).ok,
      ).toBe(true);
    });
  });

  describe('runs the logic the control UTxO names', () => {
    it.each<
      [string, () => TransactionShape, Partial<CustodyInspectionOptions>]
    >([
      ['a creation', () => creation(initialState), {}],
      ['a device rewrite', () => deviceRewrite(grantedState, grantedState), {}],
      [
        'a grant spend',
        () => grantSpend(grantedState, lovelaceGrant),
        GRANT_SPEND,
      ],
    ])('refuses %s without the logic run', (_, shapeOf, options) => {
      expect(
        refusalsOf(inspect({ ...shapeOf(), logicRuns: [] }, options)),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'logic-withdrawal-missing',
          account,
          logic: LOGIC_HASH,
        },
      ]);
    });

    it('refuses a logic run from the reward account on another network', () => {
      expect(
        reasonsOf(
          inspect({
            ...deviceRewrite(grantedState, grantedState),
            logicRuns: [
              {
                stakeAddress: Cardano.RewardAccount.fromCredential(
                  scriptCredential(LOGIC.hash),
                  Cardano.NetworkId.Mainnet,
                ),
                quantity: 0n,
              },
            ],
          }),
        ),
      ).toEqual(['custody-context-mismatch/network-mismatch']);
    });

    it('refuses an attached logic that no withdrawal runs', () => {
      expect(
        reasonsOf(
          inspect(
            embedded({
              ...deviceRewrite(grantedState, grantedState),
              logicRuns: [],
            }),
          ),
        ),
      ).toEqual([
        'custody-context-mismatch/unused-logic',
        'custody-unsupported-operation/logic-withdrawal-missing',
      ]);
    });

    it('refuses a logic run over no control UTxO that names the logic', () => {
      expect(
        refusalsOf(
          inspect(
            {
              inputs: [sponsorFee],
              outputs: [fundOutput(3_000_000n)],
              logicRuns: [logicRun()],
            },
            { accountRecord: undefined },
          ),
        ),
      ).toEqual([
        {
          code: 'custody-context-mismatch',
          reason: 'unused-logic',
          logic: LOGIC.hash,
        },
      ]);
    });

    it('refuses the logic reward account withdrawn from twice', () => {
      const entry = zeroWithdrawalEntry(LOGIC_REWARD_ACCOUNT);
      expect(
        refusalsOf(
          inspectBuilt(
            patchedBody(
              deviceRewrite(grantedState, grantedState),
              `05a1${entry}`,
              `05a2${entry}${entry}`,
            ),
          ),
        ),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'duplicate-withdrawal',
          rewardAccount: LOGIC_REWARD_ACCOUNT,
        },
      ]);
    });

    it('refuses the account reward account withdrawn from twice, whatever the decoded body keeps', () => {
      const shape: TransactionShape = {
        ...deviceRewrite(grantedState, grantedState),
        withdrawals: [{ stakeAddress: identity.rewardAccount, quantity: 0n }],
      };
      const entries = [
        zeroWithdrawalEntry(identity.rewardAccount),
        zeroWithdrawalEntry(LOGIC_REWARD_ACCOUNT),
      ].sort();
      const repeated = zeroWithdrawalEntry(identity.rewardAccount).replace(
        /00$/,
        '1a004c4b40',
      );
      expect(
        reasonsOf(
          inspectBuilt(
            patchedBody(
              shape,
              `05a2${entries.join('')}`,
              `05a3${entries.join('')}${repeated}`,
            ),
          ),
        ),
      ).toEqual(['custody-unsupported-operation/duplicate-withdrawal']);
    });

    it('refuses a body that repeats its withdrawal map', () => {
      const shape = deviceRewrite(grantedState, grantedState);
      const built = buildTransaction(shape);
      const body = built.transaction.body().toCbor();
      const fields = Number.parseInt(body.slice(1, 2), 16);
      const repeated = `a${(fields + 1).toString(16)}${body.slice(
        2,
      )}05a1${zeroWithdrawalEntry(LOGIC_REWARD_ACCOUNT)}`;
      expect(
        reasonsOf(inspectBuilt(patchedBody(shape, body, repeated))),
      ).toEqual(['custody-unsupported-operation/duplicate-withdrawal']);
    });
  });

  describe('accepts only the logics of the catalogue', () => {
    const unknownState: CustodyAccountState = {
      ...grantedState,
      logic: UNKNOWN_LOGIC,
    };

    it('refuses a control UTxO that names an unknown logic', () => {
      expect(
        refusalsOf(
          inspect({
            ...deviceRewrite(unknownState, unknownState),
            logicRuns: [unknownLogicRun()],
          }),
        ),
      ).toEqual([
        {
          code: 'custody-unsupported-version',
          reason: 'unknown-logic',
          account,
          logic: UNKNOWN_LOGIC,
        },
        {
          code: 'custody-unsupported-operation',
          reason: 'foreign-withdrawal',
          rewardAccount: unknownLogicRun().stakeAddress,
        },
      ]);
    });

    it('refuses a control UTxO that names an unknown logic beside a run of a known one', () => {
      expect(
        reasonsOf(inspect(deviceRewrite(unknownState, unknownState))),
      ).toEqual([
        'custody-context-mismatch/unused-logic',
        'custody-unsupported-version/unknown-logic',
        'custody-unsupported-operation/logic-withdrawal-missing',
      ]);
    });

    it('refuses a rewrite away from an unknown logic', () => {
      expect(
        reasonsOf(
          inspect({
            ...deviceRewrite(unknownState, grantedState),
            logicRuns: [unknownLogicRun(), logicRun()],
          }),
        ),
      ).toEqual([
        'custody-unsupported-version/unknown-logic',
        'custody-unsupported-operation/foreign-withdrawal',
        'custody-unsupported-operation/logic-changed',
      ]);
    });

    it('refuses a creation that names an unknown logic, which is no initial state Lace writes', () => {
      expect(
        reasonsOf(
          inspect(
            creation(
              { ...initialState, logic: UNKNOWN_LOGIC },
              { logicRuns: [unknownLogicRun()] },
            ),
          ),
        ),
      ).toEqual([
        'custody-unsupported-version/unknown-logic',
        'custody-unsupported-operation/foreign-withdrawal',
        'custody-context-mismatch/initial-state',
      ]);
    });

    it('refuses a grant spend against a referenced control UTxO that names an unknown logic', () => {
      expect(
        reasonsOf(
          inspect(
            {
              ...grantSpend(unknownState, lovelaceGrant),
              logicRuns: [unknownLogicRun()],
            },
            GRANT_SPEND,
          ),
        ),
      ).toEqual([
        'custody-unsupported-version/unknown-logic',
        'custody-unsupported-operation/foreign-withdrawal',
      ]);
    });

    it('refuses an upgrade to another logic, shaped like a revoke-all', () => {
      const after = {
        ...unknownState,
        grantGeneration: grantedState.grantGeneration + 1n,
        revoked: [],
      };
      const refusals = refusalsOf(
        inspect({
          ...deviceRewrite(grantedState, after),
          logicRuns: [logicRun(), unknownLogicRun()],
        }),
      );
      expect(refusals.map(({ reason }) => reason)).toEqual([
        'unknown-logic',
        'foreign-withdrawal',
        'logic-changed',
      ]);
      expect(refusals[2]).toEqual({
        code: 'custody-unsupported-operation',
        reason: 'logic-changed',
        account,
        before: LOGIC_HASH,
        after: UNKNOWN_LOGIC,
      });
    });

    it('reads a logic change between two control states', () => {
      expect(diffCustodyStates(grantedState, unknownState).logic).toEqual({
        before: LOGIC_HASH,
        after: UNKNOWN_LOGIC,
      });
      expect(
        diffCustodyStates(grantedState, grantedState).logic,
      ).toBeUndefined();
    });
  });

  describe('lets a logic run draw only into the account', () => {
    it('accepts a draw the control output keeps when the account pays its own fee', () => {
      const report = onlyAccount(
        accepted(
          inspect(
            accountPaid(2_000_000n - FEE + DRAW, {
              logicRuns: [logicRun(DRAW)],
            }),
          ),
        ),
      );
      expect(report.logicDraw).toBe(DRAW);
      expect(report.netOutflow.lovelace).toBe(FEE - DRAW);
      expect(report.operations).toEqual([]);
    });

    /**
     * A new account holds nothing before, and the bytes cannot tell the draw
     * from the lovelace the sponsor funds, so a creation keeps the draw when
     * its control output holds at least that much.
     */
    it('accepts a creation whose control output holds the draw', () => {
      const report = onlyAccount(
        accepted(
          inspect(
            creation(initialState, {
              outputs: [
                controlOutput(initialState, 2_100_000n + DRAW),
                payout(700_000n, SPONSOR_ADDRESS),
              ],
              logicRuns: [logicRun(DRAW)],
            }),
          ),
        ),
      );
      expect(report.logicDraw).toBe(DRAW);
      expect(report.operations).toEqual([{ kind: 'create' }]);
    });

    it.each<
      [string, () => TransactionShape, Partial<CustodyInspectionOptions>]
    >([
      [
        'a draw paid to a stranger',
        () =>
          accountPaid(2_000_000n - FEE, {
            outputs: [
              controlOutput(grantedState, 2_000_000n - FEE),
              payout(DRAW, STRANGER_ADDRESS),
            ],
            logicRuns: [logicRun(DRAW)],
          }),
        {},
      ],
      [
        'a draw the sponsor change takes',
        () => {
          const rewrite = deviceRewrite(grantedState, grantedState);
          return {
            ...rewrite,
            outputs: [
              rewrite.outputs[0],
              payout(4_700_000n + DRAW, SPONSOR_ADDRESS),
            ],
            logicRuns: [logicRun(DRAW)],
          };
        },
        {},
      ],
      [
        'a draw the sponsor change takes in place of part of the fee',
        () => {
          const rewrite = deviceRewrite(grantedState, grantedState);
          return {
            ...rewrite,
            outputs: [
              rewrite.outputs[0],
              payout(4_700_000n + 200_000n, SPONSOR_ADDRESS),
            ],
            logicRuns: [logicRun(200_000n)],
            fee: 300_000n,
          };
        },
        {},
      ],
      [
        'a creation whose sponsor change takes more of the draw than the control output holds',
        () =>
          creation(initialState, {
            outputs: [
              controlOutput(initialState, 2_100_000n),
              payout(700_000n + 3_000_000n, SPONSOR_ADDRESS),
            ],
            logicRuns: [logicRun(3_000_000n)],
          }),
        {},
      ],
      [
        'a draw beside an owner spend, where it cannot be told from the account lovelace',
        () => {
          const spend = ownerSpend();
          return {
            ...spend,
            outputs: [
              spend.outputs[0],
              spend.outputs[1],
              fundOutput(7_000_000n + DRAW),
              spend.outputs[3],
            ],
            logicRuns: [logicRun(DRAW)],
          };
        },
        {},
      ],
      [
        'a draw in a grant spend, even one the account keeps',
        () => {
          const spend = grantSpend(grantedState, lovelaceGrant, 0n);
          return {
            ...spend,
            outputs: [spend.outputs[0], fundOutput(20_000_000n - FEE + DRAW)],
            logicRuns: [logicRun(DRAW)],
          };
        },
        GRANT_SPEND,
      ],
    ])('refuses %s', (_, shapeOf, options) => {
      const refusals = refusalsOf(inspect(shapeOf(), options));
      expect(refusals).toContainEqual({
        code: 'custody-unsupported-operation',
        reason: 'logic-draw-leaves-account',
        account,
        logic: LOGIC_HASH,
        quantity: expect.any(BigInt) as bigint,
      });
      expect(refusals.map(({ reason }) => reason)).toEqual([
        'logic-draw-leaves-account',
      ]);
    });
  });

  describe('admits only the parked contract scripts as reference scripts', () => {
    const rewrite = deviceRewrite(grantedState, grantedState);
    const withReferences = (...referenceInputs: Cardano.Utxo[]) =>
      inspect({ ...rewrite, referenceInputs });

    it.each<[string, Cardano.Script]>([
      ['the proxy', CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator],
      ['another script', REFERENCE_SCRIPT],
    ])(
      'refuses %s carried at an output reference no version pins',
      (_, script) => {
        const carrier = utxo(0xf2, {
          ...payout(20_000_000n, SPONSOR_ADDRESS),
          scriptReference: script,
        });
        expect(refusalsOf(withReferences(PARKED_LOGIC, carrier))).toEqual([
          {
            code: 'custody-unsupported-operation',
            reason: 'foreign-reference-script',
            input: { txId: carrier[0].txId, index: 0 },
          },
        ]);
      },
    );

    it.each<[string, Cardano.Script | undefined]>([
      ['another contract script', LOGIC.script],
      ['no script', undefined],
    ])('refuses a parked output reference resolved with %s', (_, script) => {
      const [input, output] = PARKED_PROXY;
      const { scriptReference: _pinned, ...withoutScript } = output;
      expect(
        refusalsOf(
          withReferences(
            [
              input,
              script ? { ...output, scriptReference: script } : withoutScript,
            ],
            PARKED_LOGIC,
          ),
        ),
      ).toEqual([
        {
          code: 'custody-context-mismatch',
          reason: 'reference-script-mismatch',
          input: { txId: input.txId, index: input.index },
        },
      ]);
    });

    it('refuses the parked scripts on a network that pins none there', () => {
      expect(
        reasonsOf(
          inspect(rewrite, {
            chainId: Cardano.ChainIds.Preview,
            accountRecord: undefined,
          }),
        ),
      ).toEqual([
        'custody-unsupported-operation/foreign-reference-script',
        'custody-unsupported-operation/foreign-reference-script',
      ]);
    });
  });

  describe('accepts only the grant spend shape agents sign', () => {
    const spend = () => grantSpend(grantedState, lovelaceGrant);

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'an input outside the account address',
        () => {
          const shape = spend();
          return {
            ...shape,
            inputs: [...shape.inputs, sponsorFee],
            outputs: [...shape.outputs, payout(5_000_000n, SPONSOR_ADDRESS)],
          };
        },
        ['custody-unsupported-operation/grant-spend-foreign-input'],
      ],
      [
        'a withdrawal from the account reward account',
        () => ({
          ...spend(),
          withdrawals: [{ stakeAddress: identity.rewardAccount, quantity: 0n }],
        }),
        ['custody-unsupported-operation/stake-operation-without-control'],
      ],
      [
        'a withdrawal from another reward account',
        () => ({
          ...spend(),
          withdrawals: [
            {
              stakeAddress: Cardano.RewardAccount.fromCredential(
                scriptCredential('fa'.repeat(28)),
                Cardano.NetworkId.Testnet,
              ),
              quantity: 0n,
            },
          ],
        }),
        ['custody-unsupported-operation/foreign-withdrawal'],
      ],
      [
        'a mint',
        () => ({ ...spend(), mint: new Map([[TOKEN, 1n]]) }),
        ['custody-unsupported-operation/foreign-mint'],
      ],
      [
        'a certificate',
        () => ({ ...spend(), certificates: [delegation] }),
        ['custody-unsupported-operation/stake-operation-without-control'],
      ],
    ])('refuses a grant spend with %s', (_, shapeOf, reasons) => {
      expect(reasonsOf(inspect(shapeOf(), GRANT_SPEND))).toEqual(reasons);
    });

    it('names the input outside the account address', () => {
      const shape = spend();
      expect(
        refusalsOf(
          inspect(
            {
              ...shape,
              inputs: [...shape.inputs, sponsorFee],
              outputs: [...shape.outputs, payout(5_000_000n, SPONSOR_ADDRESS)],
            },
            GRANT_SPEND,
          ),
        ),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'grant-spend-foreign-input',
          account,
          input: { txId: sponsorFee[0].txId, index: 0 },
        },
      ]);
    });
  });

  it('refuses no grant spend for its foreign inputs unless it is allowed', () => {
    const shape = grantSpend(grantedState, lovelaceGrant);
    expect(
      reasonsOf(
        inspect(
          { ...shape, inputs: [...shape.inputs, sponsorFee] },
          { deviceKeyHash: undefined },
        ),
      ),
    ).toEqual(['custody-unsupported-operation/grant-spend']);
  });
});
