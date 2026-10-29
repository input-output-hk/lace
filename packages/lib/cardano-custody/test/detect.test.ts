import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16, Hash32ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { CURRENT_CUSTODY_CONTRACT_VERSION, detectCustodyEffects } from '../src';

import {
  account,
  BARE_VALIDATOR_ADDRESS,
  buildTransaction,
  controlOutput,
  creation,
  deviceRewrite,
  fundOutput,
  grantIssue,
  grantOutput,
  grantSpend,
  grantSweep,
  grantToken,
  identity,
  LOGIC,
  LOGIC_REWARD_ACCOUNT,
  logicRun,
  NFT,
  otherAccount,
  otherIdentity,
  payout,
  reserveOutput,
  SPONSOR_ADDRESS,
  sponsorFee,
  UNKNOWN_LOGIC,
  utxo,
  VALIDATOR_POINTER_ADDRESS,
  VALIDATOR_WITH_KEY_STAKE_ADDRESS,
} from './custody-transactions';
import {
  fixtureGrants,
  grantedState,
  initialState,
  OWNER_KEY,
} from './fixtures';

import type { TransactionShape } from './custody-transactions';

const detect = (shape: TransactionShape) =>
  detectCustodyEffects(buildTransaction(shape).transaction);

const paying = (
  outputs: Cardano.TxOut[],
  changes: Partial<TransactionShape> = {},
): TransactionShape => ({
  inputs: [sponsorFee],
  outputs: [...outputs, payout(1_000_000n, SPONSOR_ADDRESS)],
  ...changes,
});

const DATUM_HASH = Hash32ByteBase16('00'.repeat(32));

describe('detectCustodyEffects', () => {
  it('finds nothing in an ordinary payment', () => {
    expect(detect(paying([payout(2_000_000n)]))).toEqual({
      custodyTouching: false,
      depositOnly: false,
      reasons: [],
    });
  });

  it('reads a datum-free payment to custody accounts as a deposit only', () => {
    expect(
      detect(
        paying([
          fundOutput(2_000_000n),
          { address: otherIdentity.address, value: { coins: 3_000_000n } },
        ]),
      ),
    ).toEqual({
      custodyTouching: false,
      depositOnly: true,
      reasons: [
        { kind: 'deposit', location: { kind: 'output', index: 0 }, account },
        {
          kind: 'deposit',
          location: { kind: 'output', index: 1 },
          account: otherAccount,
        },
      ],
    });
  });

  it.each<[string, Cardano.TxOut, string[]]>([
    [
      'an inline datum at an account',
      { ...fundOutput(2_000_000n), datum: 42n },
      ['output-datum'],
    ],
    ['a reserve at an account', reserveOutput(2_000_000n), ['output-datum']],
    [
      'a datum hash at an account',
      { ...fundOutput(2_000_000n), datumHash: DATUM_HASH },
      ['output-datum'],
    ],
    [
      'a control output',
      controlOutput(grantedState),
      ['account-token', 'output-datum'],
    ],
    [
      'a grant output',
      grantOutput(fixtureGrants[0]),
      ['account-token', 'output-datum'],
    ],
    [
      'a datum-free output holding a grant token',
      {
        address: identity.address,
        value: { coins: 2_000_000n, assets: new Map([[grantToken(0n), 1n]]) },
      },
      ['account-token'],
    ],
    [
      'a datum-free output holding the state NFT',
      {
        address: identity.address,
        value: { coins: 2_000_000n, assets: new Map([[NFT, 1n]]) },
      },
      ['account-token'],
    ],
    [
      'the state NFT away from every account',
      {
        address: SPONSOR_ADDRESS,
        value: { coins: 2_000_000n, assets: new Map([[NFT, 1n]]) },
      },
      ['account-token'],
    ],
    [
      'a payment to the account validator with no stake part',
      payout(2_000_000n, BARE_VALIDATOR_ADDRESS),
      ['unspendable-output'],
    ],
    [
      'a payment to the account validator with a key stake part',
      payout(2_000_000n, VALIDATOR_WITH_KEY_STAKE_ADDRESS),
      ['unspendable-output'],
    ],
    [
      'a payment to the account validator with a pointer stake part',
      payout(2_000_000n, VALIDATOR_POINTER_ADDRESS),
      ['unspendable-output'],
    ],
    [
      'a datum at the account validator with no stake part',
      { ...payout(2_000_000n, BARE_VALIDATOR_ADDRESS), datum: 42n },
      ['output-datum'],
    ],
  ])('touches custody with %s', (_, txOut, kinds) => {
    const effects = detect(paying([txOut]));
    expect(effects.custodyTouching).toBe(true);
    expect(effects.depositOnly).toBe(false);
    expect(effects.reasons).toEqual(
      kinds.map(kind => ({ kind, location: { kind: 'output', index: 0 } })),
    );
  });

  it('touches custody when a deposit sits beside another custody element', () => {
    const effects = detect(
      paying([fundOutput(2_000_000n), { ...fundOutput(1n), datum: 1n }]),
    );
    expect(effects.custodyTouching).toBe(true);
    expect(effects.depositOnly).toBe(false);
  });

  it('reads the collateral return', () => {
    expect(
      detect(
        paying([], {
          collateralReturn: { ...fundOutput(4_000_000n), datum: 1n },
        }),
      ).reasons,
    ).toEqual([
      { kind: 'output-datum', location: { kind: 'collateral-return' } },
    ]);
    expect(
      detect(paying([], { collateralReturn: fundOutput(4_000_000n) })),
    ).toMatchObject({
      depositOnly: true,
      reasons: [{ kind: 'deposit', location: { kind: 'collateral-return' } }],
    });
  });

  it('touches custody with a state NFT mint', () => {
    expect(detect(paying([], { mint: new Map([[NFT, 1n]]) })).reasons).toEqual([
      { kind: 'account-token-mint', assetId: NFT },
    ]);
  });

  it('touches custody with a grant token burn', () => {
    expect(
      detect(paying([], { mint: new Map([[grantToken(0n), -1n]]) })).reasons,
    ).toEqual([{ kind: 'account-token-mint', assetId: grantToken(0n) }]);
  });

  it('touches custody with the account validator as a witness script', () => {
    expect(
      detect(
        paying([], {
          scripts: [
            CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
            identity.stakeScript,
          ],
        }),
      ).reasons,
    ).toEqual([{ kind: 'account-validator-witness' }]);
  });

  it('ignores other witness scripts', () => {
    expect(
      detect(paying([], { scripts: [identity.stakeScript] })).custodyTouching,
    ).toBe(false);
  });

  it('reads the custody elements of a sub-transaction', () => {
    const effects = detect(
      paying([], {
        body: {
          subTransactions: [
            {
              body: { inputs: [], outputs: [payout(1n)] },
              witness: { signatures: new Map() },
            },
            {
              body: {
                inputs: [],
                outputs: [fundOutput(2_000_000n), controlOutput(grantedState)],
                mint: new Map([[NFT, 1n]]),
              },
              witness: {
                signatures: new Map(),
                scripts: [
                  CURRENT_CUSTODY_CONTRACT_VERSION.accountValidator,
                  LOGIC.script,
                ],
              },
            },
            {
              body: {
                inputs: [],
                outputs: [],
                withdrawals: [logicRun()],
              },
              witness: { signatures: new Map() },
            },
          ],
        },
      }),
    );
    expect(effects).toEqual({
      custodyTouching: true,
      depositOnly: false,
      reasons: [
        {
          kind: 'deposit',
          location: { kind: 'output', index: 0, subTransactionIndex: 1 },
          account,
        },
        {
          kind: 'account-token',
          location: { kind: 'output', index: 1, subTransactionIndex: 1 },
        },
        {
          kind: 'output-datum',
          location: { kind: 'output', index: 1, subTransactionIndex: 1 },
        },
        { kind: 'account-token-mint', assetId: NFT, subTransactionIndex: 1 },
        { kind: 'account-validator-witness', subTransactionIndex: 1 },
        { kind: 'logic-witness', subTransactionIndex: 1 },
        {
          kind: 'logic-withdrawal',
          rewardAccount: LOGIC_REWARD_ACCOUNT,
          subTransactionIndex: 2,
        },
      ],
    });
  });

  it.each([
    ['a creation', creation(initialState)],
    ['a device rewrite', deviceRewrite(grantedState, grantedState)],
    [
      'a grant issue',
      grantIssue(grantedState, [{ ...fixtureGrants[0], slot: 3n }]),
    ],
    [
      'a grant sweep',
      grantSweep({ ...grantedState, revoked: [0n] }, [fixtureGrants[0]]),
    ],
  ])('touches custody with %s', (_, shape) => {
    expect(detect(shape).custodyTouching).toBe(true);
  });

  it('finds a grant spend by the grant output it recreates', () => {
    expect(
      detect({ ...grantSpend(grantedState, fixtureGrants[0]), scripts: [] }),
    ).toEqual({
      custodyTouching: true,
      depositOnly: false,
      reasons: [
        { kind: 'account-token', location: { kind: 'output', index: 0 } },
        { kind: 'output-datum', location: { kind: 'output', index: 0 } },
        {
          kind: 'deposit',
          location: { kind: 'output', index: 2 },
          account,
        },
        { kind: 'logic-withdrawal', rewardAccount: LOGIC_REWARD_ACCOUNT },
      ],
    });
  });

  it('finds a spend whose scripts are only referenced by the control output it recreates and its logic run', () => {
    expect(detect(deviceRewrite(grantedState, grantedState))).toEqual({
      custodyTouching: true,
      depositOnly: false,
      reasons: [
        { kind: 'account-token', location: { kind: 'output', index: 0 } },
        { kind: 'output-datum', location: { kind: 'output', index: 0 } },
        { kind: 'logic-withdrawal', rewardAccount: LOGIC_REWARD_ACCOUNT },
      ],
    });
  });

  it('touches custody with a withdrawal that runs a known logic', () => {
    expect(detect(paying([], { logicRuns: [logicRun(5n)] }))).toEqual({
      custodyTouching: true,
      depositOnly: false,
      reasons: [
        { kind: 'logic-withdrawal', rewardAccount: LOGIC_REWARD_ACCOUNT },
      ],
    });
  });

  it('touches custody with a known logic as a witness script', () => {
    expect(detect(paying([], { scripts: [LOGIC.script] })).reasons).toEqual([
      { kind: 'logic-witness' },
    ]);
  });

  it('ignores a withdrawal from a logic outside the catalogue', () => {
    expect(
      detect(
        paying([], {
          withdrawals: [
            {
              stakeAddress: Cardano.RewardAccount.fromCredential(
                {
                  type: Cardano.CredentialType.ScriptHash,
                  hash: Hash28ByteBase16(UNKNOWN_LOGIC),
                },
                Cardano.NetworkId.Testnet,
              ),
              quantity: 0n,
            },
          ],
        }),
      ).custodyTouching,
    ).toBe(false);
  });

  it('cannot see a withdrawal that only references the control UTxO', () => {
    expect(
      detect(
        paying([], {
          referenceInputs: [utxo(0x10, controlOutput(grantedState))],
          withdrawals: [
            { stakeAddress: identity.rewardAccount, quantity: 5_000_000n },
          ],
          requiredSigners: [OWNER_KEY],
          scripts: [identity.stakeScript],
        }),
      ),
    ).toEqual({ custodyTouching: false, depositOnly: false, reasons: [] });
  });
});
