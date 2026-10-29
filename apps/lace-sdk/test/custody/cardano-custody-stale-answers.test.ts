import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  CardanoCustodyFundContentionError,
  CardanoCustodyRewardBalanceChangedError,
  CardanoCustodyStaleControlError,
  CardanoCustodyStaleGrantError,
} from '../../src/custody/cardano-custody-errors';
import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import {
  custodyInputRolesOf,
  isAlreadyRegisteredRefusal,
  staleSponsorRefusalOf,
  staleSubmissionErrorOf,
} from '../../src/custody/cardano-custody-stale-answers';

import {
  agentGrantUtxo,
  buildResultOf,
  creationShape,
  fundUtxo,
  grantedControl,
  grantSpendShape,
  issueGrantShape,
  liveControl,
  record,
  sweepGrantShape,
  utxo,
} from './custody-fixtures';
import { SPONSOR_DETAILS } from './sponsor-detail-catalogue';

const txInOf = ([{ txId, index }]: Cardano.Utxo): Cardano.TxIn => ({
  txId,
  index,
});

const rolesOf = (result: ReturnType<typeof buildResultOf>) =>
  custodyInputRolesOf(
    result.transaction,
    result.resolvedInputs,
    record.address,
  );

const grantSpendRoles = rolesOf(buildResultOf(grantSpendShape()));
const ownerRoles = rolesOf(buildResultOf(issueGrantShape()));
const creationRoles = rolesOf(buildResultOf(creationShape()));

const refusal = (
  detail: string,
  rule = 'account_transaction',
  code = 'invalid_transaction',
) => new CardanoCustodySponsorError({ status: 422, code, rule, detail });

describe('custodyInputRolesOf', () => {
  it('sorts a grant spend into its referenced control, its grant and its funds', () => {
    expect(grantSpendRoles).toEqual({
      controls: [txInOf(grantedControl)],
      grants: [{ input: txInOf(agentGrantUtxo), slot: 0n }],
      funds: [txInOf(fundUtxo)],
    });
  });

  it('keeps a fund that holds a token of another policy a fund', () => {
    const tokenFund = utxo(0x11, {
      ...fundUtxo[1],
      value: {
        coins: fundUtxo[1].value.coins,
        assets: new Map([
          [Cardano.AssetId(`${'cd'.repeat(28)}${record.stakeScriptHash}`), 1n],
        ]),
      },
    });
    const shape = issueGrantShape();
    const result = buildResultOf(shape, {
      resolvedInputs: [liveControl, tokenFund, ...(shape.collaterals ?? [])],
    });

    expect(rolesOf(result)).toEqual({
      controls: [txInOf(liveControl)],
      grants: [],
      funds: [txInOf(fundUtxo)],
    });
  });

  it('finds no account input in a creation', () => {
    expect(creationRoles).toEqual({ controls: [], grants: [], funds: [] });
  });
});

describe('staleSponsorRefusalOf', () => {
  it.each([
    ['an error of another kind', new Error('network down')],
    [
      'a refusal without a rule',
      new CardanoCustodySponsorError({
        status: 422,
        code: 'invalid_transaction',
      }),
    ],
    [
      'another service error',
      refusal('', 'account_transaction', 'quota_exceeded'),
    ],
    ['another account reading', refusal('The account token is malformed')],
    [
      'an evaluation failure',
      refusal('The transaction does not evaluate: boom', 'evaluates'),
    ],
    ['another rule', refusal('anything', 'signers')],
  ])('answers nothing for %s', (_, error) => {
    expect(staleSponsorRefusalOf(error, grantSpendRoles)).toBeUndefined();
  });

  it.each([
    'An account creation mints exactly one token under the account policy',
    'An account creation mints a state NFT named with the 28 bytes of its stake script hash',
    'An account creation registers exactly one script stake credential with its deposit',
    'No input is an account control or grant UTxO',
  ])(
    'maps a broken creation reading after a spent owner control: %s',
    detail => {
      expect(staleSponsorRefusalOf(refusal(detail), ownerRoles)).toEqual(
        new CardanoCustodyStaleControlError(),
      );
      expect(
        staleSponsorRefusalOf(refusal(detail), creationRoles),
      ).toBeUndefined();
    },
  );

  it('maps a burn misread as a creation after the sweep control is spent', () => {
    const roles = rolesOf(buildResultOf(sweepGrantShape()));
    expect(
      staleSponsorRefusalOf(
        refusal(
          'An account creation mints exactly one token under the account policy',
        ),
        roles,
      ),
    ).toEqual(new CardanoCustodyStaleControlError());
  });

  it.each([ownerRoles, grantSpendRoles])(
    'maps uncovered outflow before evaluation to fund contention',
    roles => {
      expect(
        staleSponsorRefusalOf(
          refusal(
            'Outputs exceed the non-sponsor inputs',
            'no_sponsor_value_elsewhere',
          ),
          roles,
        ),
      ).toEqual(new CardanoCustodyFundContentionError(roles.funds));
    },
  );

  it('does not guess which of several funds caused uncovered outflow', () => {
    const roles = {
      ...grantSpendRoles,
      funds: [...grantSpendRoles.funds, { ...fundUtxo[0], index: 1 }],
    };
    expect(
      staleSponsorRefusalOf(
        refusal(
          'Outputs exceed the non-sponsor inputs',
          'no_sponsor_value_elsewhere',
        ),
        roles,
      ),
    ).toEqual(new CardanoCustodyFundContentionError([]));
  });

  it('leaves uncovered outflow without account funds unmapped', () => {
    expect(
      staleSponsorRefusalOf(
        refusal(
          'Outputs exceed the non-sponsor inputs',
          'no_sponsor_value_elsewhere',
        ),
        creationRoles,
      ),
    ).toBeUndefined();
  });

  it('reads a referenced control no input operates in an owner operation as a stale control UTxO', () => {
    expect(
      staleSponsorRefusalOf(
        refusal(
          `Reference input ${'ab'.repeat(
            32,
          )}#0 is the control UTxO of account ${
            record.stakeScriptHash
          }, which no input operates`,
        ),
        ownerRoles,
      ),
    ).toEqual(new CardanoCustodyStaleControlError());
  });

  it('reads an unknown reference input as a stale control UTxO', () => {
    expect(
      staleSponsorRefusalOf(
        refusal(
          `Reference input ${grantedControl[0].txId}#0 is not an unspent output the chain knows`,
          'evaluates',
        ),
        grantSpendRoles,
      ),
    ).toEqual(new CardanoCustodyStaleControlError());
  });

  it('leaves an unknown reference input that holds no control UTxO unmapped', () => {
    expect(
      staleSponsorRefusalOf(
        refusal(
          SPONSOR_DETAILS.unknownReferenceInput(`${'ab'.repeat(32)}#0`),
          'evaluates',
        ),
        grantSpendRoles,
      ),
    ).toBeUndefined();
  });

  it.each([
    {
      name: 'the grant UTxO',
      named: agentGrantUtxo,
      roles: grantSpendRoles,
      expected: new CardanoCustodyStaleGrantError(0n),
    },
    {
      name: 'the control UTxO',
      named: liveControl,
      roles: ownerRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
  ])(
    'names $name when the sponsor names it as unknown',
    ({ named, roles, expected }) => {
      expect(
        staleSponsorRefusalOf(
          refusal(
            `Input ${named[0].txId.toUpperCase()}#0 is not an unspent output the chain knows`,
            'evaluates',
          ),
          roles,
        ),
      ).toEqual(expected);
    },
  );

  it('falls back to the control UTxO for an input it cannot read', () => {
    expect(
      staleSponsorRefusalOf(
        refusal(
          'Input nonsense is not an unspent output the chain knows',
          'evaluates',
        ),
        ownerRoles,
      ),
    ).toEqual(new CardanoCustodyStaleControlError());
  });
});

// Review finding 8: the classification reads the sponsor's free-text
// details, so it is pinned to the details the pinned sponsor writes.
describe('staleSponsorRefusalOf against the fee sponsor details at 3cdb361', () => {
  const ref = ([{ txId, index }]: Cardano.Utxo) => `${txId}#${index}`;
  const account = record.stakeScriptHash;

  it.each([
    {
      name: 'a grant UTxO whose control UTxO is gone',
      detail: SPONSOR_DETAILS.orphanGrant(ref(agentGrantUtxo), account),
      rule: 'account_transaction',
      roles: grantSpendRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
    {
      name: 'a referenced control UTxO whose grant UTxO is gone',
      detail: SPONSOR_DETAILS.unoperatedControl(ref(grantedControl), account),
      rule: 'account_transaction',
      roles: grantSpendRoles,
      expected: new CardanoCustodyStaleGrantError(0n),
    },
    {
      name: 'an owner operation whose control UTxO is gone',
      detail: SPONSOR_DETAILS.noAccountInput,
      rule: 'account_transaction',
      roles: ownerRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
    {
      name: 'an issue misread as a creation once its control UTxO is gone',
      detail: SPONSOR_DETAILS.creationMintCount,
      rule: 'account_transaction',
      roles: ownerRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
    {
      name: 'a burn misread as a creation once its control UTxO is gone',
      detail: SPONSOR_DETAILS.creationNftName,
      rule: 'account_transaction',
      roles: rolesOf(buildResultOf(sweepGrantShape())),
      expected: new CardanoCustodyStaleControlError(),
    },
    {
      name: 'a mint misread as a creation without a registration',
      detail: SPONSOR_DETAILS.creationRegistration,
      rule: 'account_transaction',
      roles: ownerRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
    {
      name: 'a spent fund the remaining inputs cannot replace',
      detail: SPONSOR_DETAILS.uncoveredOutflow(2_250_000n, 0n),
      rule: 'no_sponsor_value_elsewhere',
      roles: grantSpendRoles,
      expected: new CardanoCustodyFundContentionError(grantSpendRoles.funds),
    },
    {
      name: 'a spent fund the chain no longer knows',
      detail: SPONSOR_DETAILS.unknownInput(ref(fundUtxo)),
      rule: 'evaluates',
      roles: grantSpendRoles,
      expected: new CardanoCustodyFundContentionError([txInOf(fundUtxo)]),
    },
    {
      name: 'a spent grant UTxO the chain no longer knows',
      detail: SPONSOR_DETAILS.unknownInput(ref(agentGrantUtxo)),
      rule: 'evaluates',
      roles: grantSpendRoles,
      expected: new CardanoCustodyStaleGrantError(0n),
    },
    {
      name: 'a referenced control UTxO the chain no longer knows',
      detail: SPONSOR_DETAILS.unknownReferenceInput(ref(grantedControl)),
      rule: 'evaluates',
      roles: grantSpendRoles,
      expected: new CardanoCustodyStaleControlError(),
    },
  ])('reads $name', ({ detail, rule, roles, expected }) => {
    expect(staleSponsorRefusalOf(refusal(detail, rule), roles)).toEqual(
      expected,
    );
  });
});

describe('staleSubmissionErrorOf', () => {
  const badInputs = (inputs: string) =>
    new Error(
      `ProviderError: BAD_REQUEST ({"message":"ConwayUtxowFailure (UtxoFailure (BadInputsUTxO (fromList [${inputs}])))"})`,
    );
  const ledgerInput = (txId: string, index: number) =>
    `TxIn (TxId {unTxId = SafeHash \\"${txId}\\"}) (TxIx {unTxIx = ${index}})`;

  it('answers nothing for another refusal', () => {
    expect(
      staleSubmissionErrorOf(
        new Error('ValueNotConservedUTxO'),
        grantSpendRoles,
      ),
    ).toBeUndefined();
  });

  it('answers nothing for a transaction without account inputs, such as a creation', () => {
    expect(
      staleSubmissionErrorOf(
        badInputs(ledgerInput('ab'.repeat(32), 0)),
        creationRoles,
      ),
    ).toBeUndefined();
  });

  it('reads the ledger spelling with a record index', () => {
    expect(
      staleSubmissionErrorOf(
        badInputs(ledgerInput(fundUtxo[0].txId, 0)),
        grantSpendRoles,
      ),
    ).toEqual(new CardanoCustodyFundContentionError([txInOf(fundUtxo)]));
  });

  it('counts an input whose id appears without an index it can read', () => {
    expect(
      staleSubmissionErrorOf(
        new Error(`BadInputsUTxO ${agentGrantUtxo[0].txId}`),
        grantSpendRoles,
      ),
    ).toEqual(new CardanoCustodyStaleGrantError(0n));
  });

  it.each([
    'ConwayCertsFailure (WithdrawalsNotInRewardsCERTS (fromList [(RewardAccount {raNetwork = Testnet}, Coin 0)]))',
    'ConwayLedgerFailure (ConwayIncompleteWithdrawals (fromList []))',
  ])('reads a withdrawal of less than the whole balance: %s', message => {
    expect(staleSubmissionErrorOf(new Error(message), ownerRoles)).toEqual(
      new CardanoCustodyRewardBalanceChangedError(),
    );
  });

  it('names a spent account input before a changed reward balance', () => {
    expect(
      staleSubmissionErrorOf(
        new Error(
          `BadInputsUTxO ${fundUtxo[0].txId} WithdrawalsNotInRewardsCERTS`,
        ),
        grantSpendRoles,
      ),
    ).toEqual(new CardanoCustodyFundContentionError([txInOf(fundUtxo)]));
  });

  it('names the referenced control UTxO before the other inputs', () => {
    expect(
      staleSubmissionErrorOf(
        badInputs(
          [grantedControl, agentGrantUtxo, fundUtxo]
            .map(([{ txId }]) => ledgerInput(txId, 0))
            .join(','),
        ),
        grantSpendRoles,
      ),
    ).toEqual(new CardanoCustodyStaleControlError());
  });
});

describe('isAlreadyRegisteredRefusal', () => {
  it.each([
    [
      'ConwayCertsFailure (CertFailure (DelegFailure (StakeKeyRegisteredDELEG (ScriptHashObj (ScriptHash "ab")))))',
      true,
    ],
    ['StakeKeyAlreadyRegisteredDELEG', true],
    ['{"code":3145,"message":"credentialAlreadyRegistered"}', true],
    ['BadInputsUTxO', false],
  ])('reads %s as %s', (message, expected) => {
    expect(isAlreadyRegisteredRefusal(new Error(message))).toBe(expected);
  });
});
