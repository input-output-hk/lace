import { describe, expect, it } from 'vitest';

import {
  CardanoCustodyLogicNotServedError,
  CardanoCustodyLogicRewardBalanceError,
  CardanoCustodyScriptDataHashError,
} from '../../src/custody/cardano-custody-errors';
import { CardanoCustodySponsorError } from '../../src/custody/cardano-custody-sponsor';
import { persistentSponsorRefusalOf } from '../../src/custody/cardano-custody-sponsor-refusals';

import { identity, liveControl, record } from './custody-fixtures';
import { SPONSOR_DETAILS } from './sponsor-detail-catalogue';

const LOGIC = '2cd68e398bdf9fbc8d257614b54403451ee722520ec785fe14f8df5a';
const UNKNOWN_LOGIC =
  '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d';

const refusal = (rule: string, detail: string, code = 'invalid_transaction') =>
  new CardanoCustodySponsorError({ status: 422, code, rule, detail });

const where = SPONSOR_DETAILS.controlUtxo(
  `${liveControl[0].txId}#0`,
  record.stakeScriptHash,
);

describe('persistentSponsorRefusalOf against the fee sponsor details at 3cdb361', () => {
  it.each([
    [
      'a control UTxO under a logic the sponsor does not know',
      refusal(
        'known_logic',
        SPONSOR_DETAILS.unknownLogic(where, UNKNOWN_LOGIC),
      ),
      new CardanoCustodyLogicNotServedError(
        SPONSOR_DETAILS.unknownLogic(where, UNKNOWN_LOGIC),
      ),
    ],
    [
      'a control UTxO that names no logic',
      refusal('known_logic', SPONSOR_DETAILS.noLogic(where)),
      new CardanoCustodyLogicNotServedError(SPONSOR_DETAILS.noLogic(where)),
    ],
    [
      'a script data hash the sponsor computes otherwise',
      refusal(
        'script_data_hash',
        SPONSOR_DETAILS.scriptDataMismatch('aa'.repeat(32), 'bb'.repeat(32)),
      ),
      new CardanoCustodyScriptDataHashError(
        SPONSOR_DETAILS.scriptDataMismatch('aa'.repeat(32), 'bb'.repeat(32)),
      ),
    ],
  ])('reads %s', (_, error, expected) => {
    const typed = persistentSponsorRefusalOf(error);

    expect(typed).toEqual(expected);
    expect(typed?.constructor).toBe(expected.constructor);
  });

  it('reads a logic run that draws lovelace as a logic reward balance', () => {
    const typed = persistentSponsorRefusalOf(
      refusal(
        'no_foreign_scripts',
        SPONSOR_DETAILS.logicDraw(LOGIC, 1_500_000n),
      ),
    );

    expect(typed).toBeInstanceOf(CardanoCustodyLogicRewardBalanceError);
    expect(typed).toMatchObject({
      code: 'custody-logic-reward-balance',
      logic: LOGIC,
      balance: 1_500_000n,
    });
  });

  it.each([
    ['an error of another kind', new Error('network down')],
    [
      'another service error under the rule',
      refusal('known_logic', 'anything', 'quota_exceeded'),
    ],
    [
      'another foreign script refusal',
      refusal(
        'no_foreign_scripts',
        SPONSOR_DETAILS.duplicateWithdrawal(identity.rewardAccount),
      ),
    ],
    [
      'a stale input',
      refusal('account_transaction', SPONSOR_DETAILS.noAccountInput),
    ],
    [
      'a script data hash the sponsor could not compute, which can pass',
      refusal(
        'script_data_hash',
        SPONSOR_DETAILS.scriptDataUncomputed('Blockfrost answered 503'),
      ),
    ],
  ])('answers nothing for %s', (_, error) => {
    expect(persistentSponsorRefusalOf(error)).toBeUndefined();
  });
});
