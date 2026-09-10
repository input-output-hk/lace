import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { createFormInitialState } from '../../src/store/form-initial-state';
import { isFormCorrect } from '../../src/store/is-form-correct';

import type { StateOpen } from '../../src/types';
import type { Address } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const token: Token = {
  accountId: 'acc' as AccountId,
  address: 'addr' as Address,
  blockchainName: 'Midnight',
  tokenId: TokenId('id'),
  available: BigNumber(100n),
  pending: BigNumber(0n),
  displayLongName: 'Test token',
  displayShortName: 'TT1',
  decimals: 2,
  metadata: {
    name: 'Test token',
    decimals: 2,
    ticker: 'TT1',
    blockchainSpecific: {},
  },
};

const validForm = (): StateOpen['form'] =>
  createFormInitialState({
    token,
    amount: BigNumber(5n),
    address: 'recipient-address',
  });

describe('isFormCorrect', () => {
  it('is correct for a dirty, error-free form with a token transfer', () => {
    expect(isFormCorrect(validForm())).toBe(true);
  });

  it('is not correct when there are no token transfers', () => {
    // `[].every(...)` is vacuously true, so the length guard is what rejects it.
    const form = createFormInitialState({ address: 'recipient-address' });
    expect(form.tokenTransfers).toHaveLength(0);
    expect(isFormCorrect(form)).toBe(false);
  });

  it('is not correct when a transfer amount is not dirty', () => {
    const form = validForm();
    form.tokenTransfers[0].amount.dirty = false;
    expect(isFormCorrect(form)).toBe(false);
  });

  it('is not correct when a transfer amount has an error', () => {
    const form = validForm();
    form.tokenTransfers[0].amount.error = { error: 'insufficient-balance' };
    expect(isFormCorrect(form)).toBe(false);
  });

  it('is not correct when the address is not dirty', () => {
    const form = validForm();
    form.address.dirty = false;
    expect(isFormCorrect(form)).toBe(false);
  });
});
