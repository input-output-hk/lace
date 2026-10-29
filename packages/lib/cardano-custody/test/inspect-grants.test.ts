// Mirrors the IssueGrants, BurnGrants, SweepGrant and SpendWithGrant cases of
// validators/account.test.ak, validators/logic_v1.test.ak and
// validators/attacks.test.ak of Biglup/cardano-account-custody-contract at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0), modified
// for Lace: each case is a whole transaction inspection, and Lace's own
// refusals for shapes it never builds are checked beside the contract's
// rules.

import { Cardano } from '@cardano-sdk/core';
import { Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  encodeCustodyGrant,
  encodeCustodyMintRedeemer,
  replaceCustodyGrant,
  revokeAllCustodyGrants,
} from '../src';

import {
  account,
  controlOutput,
  creation,
  device,
  deviceRewrite,
  fund,
  fundOutput,
  grantIssue,
  grantOutput,
  grantSpend,
  grantSweep,
  grantToken,
  otherIdentity,
  payout,
  posixMsToSlot,
  reserveOutput,
  slotToPosixMs,
  SPONSOR_ADDRESS,
  sponsorFee,
  spendWithGrant,
  sweepGrant,
  sweptUtxosOf,
  utxo,
  VALID_UNTIL,
} from './custody-transactions';
import {
  AGENT_KEY,
  fixtureGrants,
  grantedState,
  initialState,
  lovelaceScope,
  NOW,
  OWNER_KEY,
  strangerRecipient,
  TOKEN_NAME,
  TOKEN_POLICY,
  tokenScope,
} from './fixtures';
import {
  accepted,
  grantOf,
  inspect,
  keyOf,
  onlyAccount,
  reasonsOf,
  recipientOf,
  REFERENCE_SCRIPT,
  refusalsOf,
  transition,
} from './inspect-helpers';

import type { CustodyAccountState, CustodyGrant } from '../src';
import type { TransactionShape } from './custody-transactions';
import type { Inspection } from './inspect-helpers';

const [lovelaceGrant, tokenGrant] = fixtureGrants;
const TOKEN = Cardano.AssetId(`${TOKEN_POLICY}${TOKEN_NAME}`);
const DATUM_HASH = Hash32ByteBase16('00'.repeat(32));

/** The next grant of the fixture account, to a fresh agent key. */
const nextGrant = (changes: Partial<CustodyGrant> = {}): CustodyGrant =>
  grantOf({ slot: 3n, grantee: keyOf(0x31), ...changes });

/** Grants of the agent keys 0x31 onward in consecutive slots from `slot`. */
const grantsFrom = (slot: bigint, count: number): CustodyGrant[] =>
  Array.from({ length: count }, (_, index) =>
    nextGrant({ slot: slot + BigInt(index), grantee: keyOf(0x31 + index) }),
  );

/** A state that has issued `count` grants, all outstanding. */
const issuedState = (count: number): CustodyAccountState => ({
  ...initialState,
  nextSlot: BigInt(count),
  outstanding: BigInt(count),
});

const withOutput = (
  shape: TransactionShape,
  index: number,
  txOut: Cardano.TxOut,
): TransactionShape => ({
  ...shape,
  outputs: shape.outputs.map((output, position) =>
    position === index ? txOut : output,
  ),
});

const revokedState: CustodyAccountState = { ...grantedState, revoked: [0n] };

/** A lovelace grant of slot 0 that expires at the start of `slot`. */
const expiringAt = (slot: Cardano.Slot): CustodyGrant => ({
  ...lovelaceGrant,
  scope: { ...lovelaceScope(), expiresAt: BigInt(slotToPosixMs(slot)) },
});

const GRANT_SPEND_OPTIONS = {
  allowGrantSpend: true,
  deviceKeyHash: undefined,
} as const;

const inspectSpend = (shape: TransactionShape) =>
  inspect(shape, GRANT_SPEND_OPTIONS);

/** The violation codes an allowed grant spend is refused for, in check order. */
const violationsOf = (result: Inspection) =>
  refusalsOf(result).map(refusal =>
    refusal.reason === 'grant-spend-violation'
      ? refusal.violation.code
      : `${refusal.code}/${refusal.reason}`,
  );

describe('inspectCustodyTransaction with grants', () => {
  describe('issuing grants', () => {
    it('reads an issued grant', () => {
      const grant = nextGrant();
      const report = onlyAccount(
        accepted(inspect(grantIssue(grantedState, [grant]))),
      );
      expect(report.operations).toEqual([{ kind: 'issue-grant', slot: 3n }]);
      expect(report.issuedGrants).toEqual([
        {
          outputIndex: 1,
          assetId: grantToken(3n),
          grant,
          lovelace: 2_000_000n,
        },
      ]);
      expect(report.accountOutputs.map(({ kind }) => kind)).toEqual([
        'control',
        'grant',
      ]);
      expect(report.stateChange).toMatchObject({
        nextSlot: { before: 3n, after: 4n },
        outstanding: { before: 3n, after: 4n },
        revokedAdded: [],
        revokedRemoved: [],
      });
      expect(report.netOutflow).toEqual({
        lovelace: -2_000_000n,
        assets: new Map([[grantToken(3n), -1n]]),
      });
    });

    it('reads grants issued in slot order', () => {
      const grants = grantsFrom(3n, 8);
      const report = onlyAccount(
        accepted(inspect(grantIssue(grantedState, [...grants].reverse()))),
      );
      expect(report.operations).toEqual(
        grants.map(({ slot }) => ({ kind: 'issue-grant', slot })),
      );
      expect(report.issuedGrants.map(({ grant }) => grant)).toEqual(grants);
    });

    it('reads a token grant with eight recipients', () => {
      const grant = nextGrant({
        scope: tokenScope(
          Array.from({ length: 8 }, (_, index) => recipientOf(0x70 + index)),
        ),
      });
      expect(
        onlyAccount(accepted(inspect(grantIssue(grantedState, [grant]))))
          .issuedGrants,
      ).toMatchObject([{ grant }]);
    });

    it('reads the sixteenth outstanding grant', () => {
      expect(
        onlyAccount(
          accepted(inspect(grantIssue(issuedState(15), grantsFrom(15n, 1)))),
        ).operations,
      ).toEqual([{ kind: 'issue-grant', slot: 15n }]);
    });

    it('reads a replaced grant: a revoke and an issue in one rewrite', () => {
      const replaced = transition(
        replaceCustodyGrant(
          grantedState,
          {
            slot: 0n,
            grantee: AGENT_KEY,
            scope: { ...lovelaceScope(), cap: 25_000_000n },
            now: NOW,
          },
          [lovelaceGrant],
        ),
      );
      const report = onlyAccount(
        accepted(
          inspect(grantIssue(grantedState, [replaced.grant], replaced.state)),
        ),
      );
      expect(report.operations).toEqual([
        { kind: 'replace-grant', slot: 0n, issuedSlot: 3n },
      ]);
      expect(report.stateChange?.revokedAdded).toEqual([0n]);
      expect(report.issuedGrants).toMatchObject([{ grant: replaced.grant }]);
    });

    it('reads grants issued under the generation a revoke-all moves to', () => {
      const after = {
        ...revokeAllCustodyGrants(grantedState),
        nextSlot: 4n,
        outstanding: 4n,
      };
      expect(
        onlyAccount(
          accepted(
            inspect(
              grantIssue(grantedState, [nextGrant({ generation: 1n })], after),
            ),
          ),
        ).operations,
      ).toEqual([
        { kind: 'issue-grant', slot: 3n },
        { kind: 'revoke-all-grants' },
      ]);
    });

    it('names the issue rule a grant output breaks', () => {
      const shape = grantIssue(grantedState, [nextGrant()]);
      expect(
        refusalsOf(
          inspect(
            withOutput(shape, 1, {
              ...grantOutput(nextGrant()),
              scriptReference: REFERENCE_SCRIPT,
            }),
          ),
        ),
      ).toEqual([
        {
          code: 'custody-malformed-datum',
          reason: 'grant-output-invalid',
          account,
          slot: 3n,
          problem: { code: 'reference-script', outputIndex: 1 },
        },
      ]);
    });

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'a grant token named for a skipped slot',
        () =>
          grantIssue(grantedState, [nextGrant({ slot: 4n })], {
            ...grantedState,
            nextSlot: 4n,
            outstanding: 4n,
          }),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant token reusing an issued slot',
        () =>
          grantIssue(grantedState, [nextGrant({ slot: 2n })], {
            ...grantedState,
            nextSlot: 4n,
            outstanding: 4n,
          }),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant token in no output',
        () => {
          const shape = grantIssue(grantedState, [nextGrant()]);
          return {
            ...shape,
            outputs: shape.outputs.filter((_, index) => index !== 1),
          };
        },
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant token in two outputs',
        () => {
          const shape = grantIssue(grantedState, [nextGrant()]);
          return { ...shape, outputs: [...shape.outputs, shape.outputs[1]] };
        },
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        "a grant output at another account's address",
        () =>
          withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...grantOutput(nextGrant()),
            address: otherIdentity.address,
          }),
        [
          'custody-unsupported-operation/account-token-misplaced',
          'custody-malformed-datum/grant-output-invalid',
        ],
      ],
      [
        'extra tokens on the grant output',
        () => {
          const output = grantOutput(nextGrant());
          return withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...output,
            value: {
              ...output.value,
              assets: new Map([...output.value.assets!, [TOKEN, 1n]]),
            },
          });
        },
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a reference script on the grant output',
        () =>
          withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...grantOutput(nextGrant()),
            scriptReference: REFERENCE_SCRIPT,
          }),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant datum given by hash',
        () => {
          const { datum: _, ...output } = grantOutput(nextGrant());
          return withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...output,
            datumHash: DATUM_HASH,
          });
        },
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant datum that is not a grant',
        () =>
          withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...grantOutput(nextGrant()),
            datum: 42n,
          }),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant datum of another slot under the token',
        () =>
          withOutput(grantIssue(grantedState, [nextGrant()]), 1, {
            ...grantOutput(nextGrant()),
            datum: encodeCustodyGrant(nextGrant({ slot: 4n })),
          }),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant of another generation',
        () => grantIssue(grantedState, [nextGrant({ generation: 1n })]),
        ['custody-malformed-datum/grant-output-invalid'],
      ],
      [
        'a grant with a negative cap',
        () =>
          grantIssue(grantedState, [
            nextGrant({ scope: { ...lovelaceScope(), cap: -1n } }),
          ]),
        ['custody-malformed-datum/grant-violation'],
      ],
      [
        'a lovelace grant with lovelace caps',
        () =>
          grantIssue(grantedState, [
            nextGrant({ scope: { ...lovelaceScope(), lovelaceCap: 1n } }),
          ]),
        ['custody-malformed-datum/grant-violation'],
      ],
      [
        'a grant with nine recipients',
        () =>
          grantIssue(grantedState, [
            nextGrant({
              scope: lovelaceScope(
                Array.from({ length: 9 }, (_, index) =>
                  recipientOf(0x70 + index),
                ),
              ),
            }),
          ]),
        ['custody-malformed-datum/grant-violation'],
      ],
      [
        'a grant to a grantee whose key hash is not 28 bytes',
        () =>
          grantIssue(grantedState, [
            nextGrant({ grantee: HexBlob('dd'.repeat(27)) }),
          ]),
        ['custody-malformed-datum/grant-violation'],
      ],
      [
        'a grant that has expired',
        () =>
          grantIssue(grantedState, [
            nextGrant({
              scope: { ...lovelaceScope(), expiresAt: BigInt(NOW) },
            }),
          ]),
        ['custody-malformed-datum/expired-grant'],
      ],
      [
        'a mint without the next slot step',
        () =>
          grantIssue(grantedState, [nextGrant()], {
            ...grantedState,
            outstanding: 4n,
          }),
        ['custody-malformed-datum/counter-mismatch'],
      ],
      [
        'a mint without the outstanding step',
        () =>
          grantIssue(grantedState, [nextGrant()], {
            ...grantedState,
            nextSlot: 4n,
          }),
        ['custody-malformed-datum/counter-mismatch'],
      ],
      [
        'a seventeenth outstanding grant',
        () => grantIssue(issuedState(16), grantsFrom(16n, 1)),
        ['custody-malformed-datum/state-violation'],
      ],
      [
        'nine grants in one rewrite',
        () => grantIssue(grantedState, grantsFrom(3n, 9)),
        ['custody-unsupported-operation/grant-batch-limit'],
      ],
      [
        'a grant token minted in quantity two',
        () => ({
          ...grantIssue(grantedState, [nextGrant()]),
          mint: new Map([[grantToken(3n), 2n]]),
        }),
        [
          'custody-unsupported-operation/unsupported-mint',
          'custody-malformed-datum/counter-mismatch',
          'custody-malformed-datum/counter-mismatch',
        ],
      ],
      [
        'a grant token minted under the burn redeemer',
        () => ({
          ...grantIssue(grantedState, [nextGrant()]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'burnGrants' }),
        }),
        ['custody-unsupported-operation/mint-redeemer-mismatch'],
      ],
      [
        'a grant token minted without the control UTxO',
        () => ({
          inputs: [sponsorFee],
          outputs: [
            grantOutput(nextGrant()),
            payout(2_800_000n, SPONSOR_ADDRESS),
          ],
          mint: new Map([[grantToken(3n), 1n]]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
          requiredSigners: [OWNER_KEY],
          invalidHereafter: VALID_UNTIL,
          scripts: [CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator],
        }),
        ['custody-unsupported-operation/grant-mint-without-control'],
      ],
      [
        'a grant token minted beside the state NFT',
        () => ({
          ...creation(initialState),
          mint: new Map([
            [creation(initialState).mint!.keys().next().value!, 1n],
            [grantToken(0n), 1n],
          ]),
        }),
        [
          'custody-unsupported-operation/unsupported-mint',
          'custody-unsupported-operation/unsupported-mint',
        ],
      ],
    ])('refuses %s', (_, shape, reasons) => {
      expect(reasonsOf(inspect(shape()))).toEqual(reasons);
    });

    it("refuses another account's grant token minted beside this control UTxO", () => {
      const otherToken = Cardano.AssetId(
        `${account.accountValidatorHash}${otherIdentity.stakeScriptHash}00000000`,
      );
      expect(
        reasonsOf(
          inspect({
            ...deviceRewrite(grantedState, grantedState),
            mint: new Map([[otherToken, 1n]]),
            mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
          }),
        ),
      ).toEqual([
        'custody-context-mismatch/foreign-account',
        'custody-unsupported-operation/unsupported-mint',
        'custody-unsupported-operation/grant-mint-without-control',
        'custody-malformed-datum/grant-output-invalid',
      ]);
    });

    it('refuses an issue and a sweep in one rewrite', () => {
      const sweep = grantSweep(revokedState, [lovelaceGrant], {
        ...grantedState,
        nextSlot: 4n,
      });
      expect(
        reasonsOf(
          inspect({
            ...sweep,
            outputs: [
              sweep.outputs[0],
              grantOutput(nextGrant()),
              ...sweep.outputs.slice(1),
            ],
            mint: new Map([...sweep.mint!, [grantToken(3n), 1n]]),
          }),
        ),
      ).toEqual(['custody-unsupported-operation/issue-sweep-mixed']);
    });
  });

  describe('revoking grants', () => {
    it.each([
      ['keeps', [0n, 0n]],
      ['repairs', [0n]],
    ] as const)(
      '%s an existing duplicate without adding another revocation',
      (_, revoked) => {
        const before = { ...revokedState, revoked: [0n, 0n] };
        expect(
          reasonsOf(inspect(deviceRewrite(before, { ...before, revoked }))),
        ).toEqual([]);
      },
    );

    it.each<[string, CustodyAccountState, string[]]>([
      [
        'a revoked slot dropped without its grant token burned',
        { ...revokedState, revoked: [] },
        ['custody-unsupported-operation/revoked-slot-restored'],
      ],
      [
        'a slot revoked before it is issued',
        { ...revokedState, revoked: [0n, 3n] },
        ['custody-unsupported-operation/revoked-slot-invalid'],
      ],
      [
        'a slot revoked twice',
        { ...revokedState, revoked: [0n, 1n, 1n] },
        ['custody-unsupported-operation/revoked-slot-invalid'],
      ],
      [
        'an already revoked slot appended again',
        { ...revokedState, revoked: [0n, 0n] },
        ['custody-unsupported-operation/revoked-slot-invalid'],
      ],
      [
        'an already revoked slot appended again after a generation step',
        { ...revokedState, grantGeneration: 1n, revoked: [0n, 0n] },
        ['custody-unsupported-operation/revoked-slot-invalid'],
      ],
      [
        'a negative slot revoked',
        { ...revokedState, revoked: [0n, -1n] },
        ['custody-unsupported-operation/revoked-slot-invalid'],
      ],
    ])('refuses %s', (_, after, reasons) => {
      expect(reasonsOf(inspect(deviceRewrite(revokedState, after)))).toEqual(
        reasons,
      );
    });

    it('refuses a thirty-third revoked slot', () => {
      const before = {
        ...issuedState(40),
        revoked: Array.from({ length: 32 }, (_, slot) => BigInt(slot)),
        outstanding: 16n,
      };
      expect(
        reasonsOf(
          inspect(
            deviceRewrite(before, {
              ...before,
              revoked: [...before.revoked, 32n],
            }),
          ),
        ),
      ).toEqual(['custody-malformed-datum/state-violation']);
    });

    it('names the revoked slot it refuses to restore', () => {
      expect(
        refusalsOf(inspect(deviceRewrite(revokedState, grantedState))),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'revoked-slot-restored',
          account,
          slot: 0n,
        },
      ]);
    });
  });

  describe('sweeping grants', () => {
    it('reads the sweep of a revoked grant, pruning its slot', () => {
      const shape = grantSweep(revokedState, [lovelaceGrant]);
      const [swept] = sweptUtxosOf([lovelaceGrant]);
      const report = onlyAccount(accepted(inspect(shape)));
      expect(report.operations).toEqual([
        { kind: 'sweep-grants', slots: [0n] },
      ]);
      expect(report.sweptGrants).toEqual([
        {
          input: { txId: swept[0].txId, index: 0 },
          assetId: grantToken(0n),
          grant: lovelaceGrant,
          lovelace: 2_000_000n,
          death: 'revoked',
        },
      ]);
      expect(report.stateChange).toMatchObject({
        revokedRemoved: [0n],
        outstanding: { before: 3n, after: 2n },
      });
      expect(report.controlOutput?.lovelace).toBe(4_000_000n);
      expect(report.netOutflow).toEqual({
        lovelace: 0n,
        assets: new Map([[grantToken(0n), 1n]]),
      });
    });

    it('reads the sweep of a revoked grant that keeps its slot listed', () => {
      expect(
        onlyAccount(
          accepted(
            inspect(
              grantSweep(revokedState, [lovelaceGrant], {
                ...revokedState,
                outstanding: 2n,
              }),
            ),
          ),
        ).operations,
      ).toEqual([{ kind: 'sweep-grants', slots: [0n] }]);
    });

    it('reads the sweep of grants a generation step superseded', () => {
      const before = revokeAllCustodyGrants(grantedState);
      const report = onlyAccount(
        accepted(inspect(grantSweep(before, fixtureGrants))),
      );
      expect(report.operations).toEqual([
        { kind: 'sweep-grants', slots: [0n, 1n, 2n] },
      ]);
      expect(report.sweptGrants.map(({ death }) => death)).toEqual([
        'superseded',
        'superseded',
        'superseded',
      ]);
    });

    it('reads eight sweeps in one rewrite', () => {
      const grants = grantsFrom(0n, 8);
      const before = {
        ...issuedState(8),
        revoked: grants.map(({ slot }) => slot),
      };
      expect(
        onlyAccount(accepted(inspect(grantSweep(before, grants)))).sweptGrants,
      ).toHaveLength(8);
    });

    it('reads the sweep of an expired grant once the validity starts after the expiry', () => {
      const expiry = Cardano.Slot(VALID_UNTIL - 7200);
      const grant = expiringAt(expiry);
      expect(
        onlyAccount(
          accepted(
            inspect({
              ...grantSweep(grantedState, [grant]),
              invalidBefore: Cardano.Slot(expiry + 1),
            }),
          ),
        ).sweptGrants,
      ).toMatchObject([{ grant, death: 'expired' }]);
    });

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'a live grant',
        () => grantSweep(grantedState, [lovelaceGrant]),
        ['custody-unsupported-operation/sweep-not-dead'],
      ],
      [
        'an expired grant with no lower validity bound',
        () =>
          grantSweep(grantedState, [
            expiringAt(Cardano.Slot(VALID_UNTIL - 7200)),
          ]),
        ['custody-unsupported-operation/sweep-not-dead'],
      ],
      [
        'an expired grant whose validity starts at the expiry',
        () => {
          const expiry = Cardano.Slot(VALID_UNTIL - 7200);
          return {
            ...grantSweep(grantedState, [expiringAt(expiry)]),
            invalidBefore: expiry,
          };
        },
        ['custody-unsupported-operation/sweep-not-dead'],
      ],
      [
        'a grant revoked in the same rewrite',
        () =>
          grantSweep(grantedState, [lovelaceGrant], {
            ...grantedState,
            outstanding: 2n,
            revoked: [0n],
          }),
        ['custody-unsupported-operation/sweep-not-dead'],
      ],
      [
        'a grant whose token is not burned',
        () => ({
          ...grantSweep(revokedState, [lovelaceGrant]),
          mint: undefined,
        }),
        [
          'custody-unsupported-operation/sweep-burn-mismatch',
          'custody-malformed-datum/counter-mismatch',
          'custody-unsupported-operation/revoked-slot-restored',
        ],
      ],
      [
        'a burn of another slot',
        () => ({
          ...grantSweep(revokedState, [lovelaceGrant]),
          mint: new Map([[grantToken(1n), -1n]]),
        }),
        [
          'custody-unsupported-operation/sweep-burn-mismatch',
          'custody-unsupported-operation/sweep-burn-mismatch',
          'custody-unsupported-operation/revoked-slot-restored',
        ],
      ],
      [
        'extra tokens on the grant UTxO',
        () => {
          const shape = grantSweep(revokedState, [lovelaceGrant]);
          const [control, swept, ...others] = shape.inputs;
          const [, output] = swept;
          const stuffed = utxo(0x30, {
            ...output,
            value: {
              ...output.value,
              assets: new Map([...output.value.assets!, [TOKEN, 1n]]),
            },
          });
          return {
            ...shape,
            inputs: [control, stuffed, ...others],
            spendRedeemers: [device(control), sweepGrant(stuffed)],
          };
        },
        ['custody-malformed-datum/grant-input-value'],
      ],
      [
        'a grant datum whose slot differs from the token',
        () => {
          const shape = grantSweep(revokedState, [lovelaceGrant]);
          const [control, swept, ...others] = shape.inputs;
          const relabelled = utxo(0x30, {
            ...swept[1],
            datum: encodeCustodyGrant({ ...lovelaceGrant, slot: 1n }),
          });
          return {
            ...shape,
            inputs: [control, relabelled, ...others],
            spendRedeemers: [device(control), sweepGrant(relabelled)],
          };
        },
        [
          'custody-malformed-datum/grant-input-value',
          'custody-unsupported-operation/sweep-burn-mismatch',
        ],
      ],
      [
        'a grant datum whose slot no grant token name can carry',
        () => {
          const shape = grantSweep(revokedState, [lovelaceGrant]);
          const [control, swept, ...others] = shape.inputs;
          const outOfRange = utxo(0x30, {
            ...swept[1],
            datum: encodeCustodyGrant({ ...lovelaceGrant, slot: 1n << 32n }),
          });
          return {
            ...shape,
            inputs: [control, outOfRange, ...others],
            spendRedeemers: [device(control), sweepGrant(outOfRange)],
          };
        },
        [
          'custody-malformed-datum/grant-input-value',
          'custody-unsupported-operation/sweep-burn-mismatch',
        ],
      ],
      [
        'a grant UTxO whose datum is not a grant',
        () => {
          const shape = grantSweep(revokedState, [lovelaceGrant]);
          const [control, swept, ...others] = shape.inputs;
          const garbled = utxo(0x30, { ...swept[1], datum: 42n });
          return {
            ...shape,
            inputs: [control, garbled, ...others],
            spendRedeemers: [device(control), sweepGrant(garbled)],
          };
        },
        [
          'custody-malformed-datum/grant-input-datum',
          'custody-unsupported-operation/sweep-burn-mismatch',
        ],
      ],
      [
        'a burn without the outstanding step',
        () =>
          grantSweep(revokedState, [lovelaceGrant], {
            ...grantedState,
            revoked: [],
          }),
        ['custody-malformed-datum/counter-mismatch'],
      ],
      [
        'nine grants in one rewrite',
        () => {
          const grants = grantsFrom(0n, 9);
          return grantSweep(
            { ...issuedState(9), revoked: grants.map(({ slot }) => slot) },
            grants,
          );
        },
        ['custody-unsupported-operation/grant-batch-limit'],
      ],
      [
        'a sweep only the grantee signs',
        () => ({
          ...grantSweep(revokedState, [lovelaceGrant]),
          requiredSigners: [AGENT_KEY],
        }),
        ['custody-device-not-listed/not-required-signer'],
      ],
      [
        'a burn under the issue redeemer',
        () => ({
          ...grantSweep(revokedState, [lovelaceGrant]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'issueGrants' }),
        }),
        ['custody-unsupported-operation/mint-redeemer-mismatch'],
      ],
    ])('refuses the sweep of %s', (_, shape, reasons) => {
      expect(reasonsOf(inspect(shape()))).toEqual(reasons);
    });

    it('refuses a sweep that references the control UTxO instead of spending it', () => {
      const shape = grantSweep(revokedState, [lovelaceGrant]);
      const [control, swept, ...others] = shape.inputs;
      expect(
        reasonsOf(
          inspect({
            ...shape,
            inputs: [swept, ...others],
            referenceInputs: [control],
            spendRedeemers: [sweepGrant(swept)],
            outputs: shape.outputs.slice(1),
          }),
        ),
      ).toEqual([
        'custody-unsupported-operation/grant-mint-without-control',
        'custody-unsupported-operation/reference-control',
        'custody-unsupported-operation/sweep-without-control',
      ]);
    });

    it('names the grant it refuses to sweep', () => {
      const [swept] = sweptUtxosOf([lovelaceGrant]);
      expect(
        refusalsOf(inspect(grantSweep(grantedState, [lovelaceGrant]))),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'sweep-not-dead',
          account,
          input: { txId: swept[0].txId, index: 0 },
          slot: 0n,
        },
      ]);
    });
  });

  describe('grant spends', () => {
    const spend = () => grantSpend(grantedState, lovelaceGrant);

    it('refuses a grant spend unless asked to inspect it', () => {
      const [spent] = spend().inputs;
      expect(
        refusalsOf(inspect(spend(), { deviceKeyHash: undefined })),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'grant-spend',
          account,
          input: { txId: spent[0].txId, index: 0 },
        },
      ]);
    });

    it('refuses metadata on a grant spend', () => {
      const shape = spend();
      const [spent] = shape.inputs;
      expect(
        refusalsOf(
          inspectSpend({
            ...shape,
            auxiliaryData: { blob: new Map([[1971n, 'pi_42']]) },
          }),
        ),
      ).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'grant-spend-metadata',
          account,
          input: { txId: spent[0].txId, index: 0 },
        },
      ]);
    });

    it('reads a grant spend when asked to', () => {
      const shape = spend();
      const [spent] = shape.inputs;
      const [control] = shape.referenceInputs!;
      const inspection = accepted(inspectSpend(shape));
      const report = onlyAccount(inspection);
      expect(report.operations).toEqual([{ kind: 'grant-spend', slot: 0n }]);
      expect(report.grantSpend).toEqual({
        input: { txId: spent[0].txId, index: 0 },
        grant: lovelaceGrant,
        outputIndex: 0,
        after: {
          ...lovelaceGrant,
          scope: { ...lovelaceGrant.scope, cap: 12_800_000n },
        },
      });
      expect(report.referencedControl).toEqual({
        input: { txId: control[0].txId, index: 0 },
        state: grantedState,
        lovelace: 2_000_000n,
      });
      expect(report.controlInput).toBeUndefined();
      expect(report.controlOutput).toBeUndefined();
      expect(report.stateChange).toBeUndefined();
      expect(report.netOutflow).toEqual({
        lovelace: 2_200_000n,
        assets: new Map(),
      });
      expect(report.accountOutputs.map(({ kind }) => kind)).toEqual([
        'grant',
        'fund',
      ]);
    });

    it('reads a token grant spend to its listed recipient', () => {
      const stocked = utxo(
        0x11,
        fundOutput(20_000_000n, new Map([[TOKEN, 30n]])),
      );
      const spent = utxo(0x13, grantOutput(tokenGrant));
      const shape = spend();
      const report = onlyAccount(
        accepted(
          inspectSpend({
            ...shape,
            inputs: [spent, stocked],
            spendRedeemers: [spendWithGrant(spent), fund(stocked)],
            outputs: [
              grantOutput({
                ...tokenGrant,
                scope: {
                  ...tokenGrant.scope,
                  cap: 40n,
                  lovelaceCap: 800_000n,
                },
              }),
              {
                address: payout(0n).address,
                value: { coins: 2_000_000n, assets: new Map([[TOKEN, 10n]]) },
              },
              fundOutput(17_800_000n, new Map([[TOKEN, 20n]])),
            ],
          }),
        ),
      );
      expect(report.operations).toEqual([{ kind: 'grant-spend', slot: 1n }]);
      expect(report.netOutflow).toEqual({
        lovelace: 2_200_000n,
        assets: new Map([[TOKEN, 10n]]),
      });
    });

    it('reports the violation and the grant input it refuses', () => {
      const shape = { ...spend(), requiredSigners: [] };
      const [spent] = shape.inputs;
      expect(refusalsOf(inspectSpend(shape))).toEqual([
        {
          code: 'custody-unsupported-operation',
          reason: 'grant-spend-violation',
          account,
          input: { txId: spent[0].txId, index: 0 },
          violation: { code: 'grantee-not-signer', grantee: AGENT_KEY },
        },
      ]);
    });

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'the grantee does not sign',
        () => ({ ...spend(), requiredSigners: [] }),
        ['grantee-not-signer'],
      ],
      [
        'the upper bound is open',
        () => ({ ...spend(), invalidHereafter: undefined }),
        ['no-upper-bound'],
      ],
      [
        'the control UTxO is not referenced',
        () => ({ ...spend(), referenceInputs: [] }),
        ['custody-context-mismatch/unused-logic', 'referenced-control-count'],
      ],
      [
        'the grant was revoked',
        () => grantSpend(revokedState, lovelaceGrant),
        ['grant-not-current'],
      ],
      [
        'a revoke-all superseded the grant',
        () => grantSpend(revokeAllCustodyGrants(grantedState), lovelaceGrant),
        ['grant-not-current'],
      ],
      [
        'the payment exceeds the per call cap',
        () => grantSpend(grantedState, lovelaceGrant, 9_900_000n),
        ['per-call-cap-exceeded'],
      ],
      [
        'the grant output raises its cap',
        () => withOutput(spend(), 0, grantOutput(lovelaceGrant)),
        ['grant-output-cap'],
      ],
      [
        'the grant output loses lovelace',
        () =>
          withOutput(
            spend(),
            0,
            grantOutput(
              {
                ...lovelaceGrant,
                scope: { ...lovelaceGrant.scope, cap: 12_800_000n },
              },
              1_900_000n,
            ),
          ),
        // The lost lovelace leaves the account, so the cap also falls short.
        ['grant-output-value', 'grant-output-cap'],
      ],
      [
        'the grant output changes the grantee',
        () =>
          withOutput(
            spend(),
            0,
            grantOutput({
              ...lovelaceGrant,
              grantee: keyOf(0x31),
              scope: { ...lovelaceGrant.scope, cap: 12_800_000n },
            }),
          ),
        ['grant-output-datum'],
      ],
      [
        'a reserve is written back to the account',
        () => {
          const shape = spend();
          return withOutput(shape, 2, {
            ...reserveOutput(17_800_000n),
          });
        },
        ['deposit-not-plain'],
      ],
    ])('refuses an allowed grant spend when %s', (_, shape, violations) => {
      expect(violationsOf(inspectSpend(shape()))).toEqual(violations);
    });

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'a reserve spent beside the grant UTxO',
        () => {
          const shape = spend();
          const reserve = utxo(0x12, reserveOutput(3_000_000n));
          return {
            ...shape,
            inputs: [...shape.inputs, reserve],
            spendRedeemers: [...shape.spendRedeemers!, fund(reserve)],
            outputs: [...shape.outputs.slice(0, 2), fundOutput(20_800_000n)],
          };
        },
        ['custody-unsupported-operation/reserve-without-control'],
      ],
      [
        'the control UTxO spent beside the reference',
        () => {
          const shape = spend();
          const control = utxo(0x15, controlOutput(grantedState));
          return {
            ...shape,
            inputs: [...shape.inputs, control],
            spendRedeemers: [...shape.spendRedeemers!, device(control)],
            outputs: [...shape.outputs, controlOutput(grantedState)],
          };
        },
        ['account-token-inputs', 'custody-device-not-listed/no-device-signer'],
      ],
      [
        "another account's control UTxO referenced",
        () => ({
          ...spend(),
          referenceInputs: [
            utxo(0x15, {
              ...controlOutput(grantedState),
              address: otherIdentity.address,
              value: {
                coins: 2_000_000n,
                assets: new Map([[otherIdentity.stateNftAssetId, 1n]]),
              },
            }),
          ],
        }),
        [
          'referenced-control-count',
          'custody-unsupported-operation/reference-control',
        ],
      ],
      [
        'a deposit of another account riding on the grant UTxO',
        () => {
          const shape = spend();
          const otherFunds = utxo(0x16, {
            address: otherIdentity.address,
            value: { coins: 5_000_000n },
          });
          return {
            ...shape,
            inputs: [...shape.inputs, otherFunds],
            spendRedeemers: [...shape.spendRedeemers!, fund(otherFunds)],
          };
        },
        [
          'custody-unsupported-operation/grant-spend-foreign-input',
          'custody-unsupported-operation/fund-without-account-token',
        ],
      ],
      [
        "another account's state NFT minted",
        () => ({
          ...spend(),
          mint: new Map([[otherIdentity.stateNftAssetId, 1n]]),
          mintRedeemer: encodeCustodyMintRedeemer({ kind: 'createAccount' }),
        }),
        [
          'mint-under-policy',
          'custody-unsupported-operation/creation-without-registration',
          'custody-malformed-datum/control-output-count',
        ],
      ],
      [
        'a deposit under a datum hash',
        () =>
          withOutput(spend(), 2, {
            ...fundOutput(17_800_000n),
            datumHash: DATUM_HASH,
          }),
        ['deposit-not-plain', 'custody-locked-output/datum-hash'],
      ],
      [
        'a deposit with a reference script',
        () =>
          withOutput(spend(), 2, {
            ...fundOutput(17_800_000n),
            scriptReference: REFERENCE_SCRIPT,
          }),
        [
          'deposit-not-plain',
          'custody-unsupported-operation/deposit-reference-script',
        ],
      ],
    ])('refuses a grant spend with %s', (_, shape, reasons) => {
      expect(
        violationsOf(
          inspect(shape(), {
            ...GRANT_SPEND_OPTIONS,
            accountRecord: undefined,
          }),
        ),
      ).toEqual(reasons);
    });

    it('refuses a grant spend to a recipient the grant does not list', () => {
      const restricted = fixtureGrants[2];
      const shape = grantSpend(grantedState, restricted);
      expect(
        violationsOf(
          inspectSpend(
            withOutput(shape, 1, payout(2_000_000n, SPONSOR_ADDRESS)),
          ),
        ),
      ).toEqual(['recipient-not-allowed']);
      expect(inspectSpend(shape).ok).toBe(true);
      expect(restricted.scope.recipients).toEqual([strangerRecipient]);
    });

    it.each<[string, () => TransactionShape, string[]]>([
      [
        'two grant UTxOs spent at once',
        () => {
          const shape = spend();
          const second = utxo(0x17, grantOutput(tokenGrant));
          return {
            ...shape,
            inputs: [...shape.inputs, second],
            spendRedeemers: [...shape.spendRedeemers!, spendWithGrant(second)],
            outputs: [...shape.outputs, grantOutput(tokenGrant)],
          };
        },
        // The token grant's caps also stay where its outflow must lower them.
        ['account-token-inputs', 'account-token-inputs', 'grant-output-cap'],
      ],
      [
        'no grant output',
        () => ({ ...spend(), outputs: spend().outputs.slice(1) }),
        ['foreign-asset-outflow', 'grant-output-count'],
      ],
      [
        'a grant datum whose slot no grant token name can carry',
        () => {
          const shape = spend();
          const [spent, ...others] = shape.inputs;
          const outOfRange = utxo(0x13, {
            ...spent[1],
            datum: encodeCustodyGrant({ ...lovelaceGrant, slot: 1n << 32n }),
          });
          return {
            ...shape,
            inputs: [outOfRange, ...others],
            spendRedeemers: [
              spendWithGrant(outOfRange),
              ...shape.spendRedeemers!.slice(1),
            ],
          };
        },
        ['grant-input-value', 'grant-output-count'],
      ],
    ])('refuses an allowed grant spend with %s', (_, shape, violations) => {
      expect(violationsOf(inspectSpend(shape()))).toEqual(violations);
    });

    it('accepts an upper bound at the expiry and refuses one after it', () => {
      const expiry = Cardano.Slot(VALID_UNTIL + 10);
      const grant = expiringAt(expiry);
      const atExpiry = {
        ...grantSpend(grantedState, grant),
        invalidHereafter: expiry,
      };
      expect(inspectSpend(atExpiry).ok).toBe(true);
      expect(
        violationsOf(
          inspectSpend({
            ...atExpiry,
            invalidHereafter: Cardano.Slot(expiry + 1),
          }),
        ),
      ).toEqual(['expired']);
      expect(posixMsToSlot(Number(grant.scope.expiresAt))).toBe(expiry);
    });
  });
});
