import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-lib/util';
import { valueToLocale } from '@lace-lib/util-render';
import { describe, expect, it } from 'vitest';

import { isSendFormReadyForReview } from '../../../src/pages/Send/isSendFormReadyForReview';

import type { Address } from '@lace-contract/addresses';
import type { SendFlowSliceState } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

const token: Token = {
  accountId: 'account' as AccountId,
  address: 'address' as Address,
  blockchainName: 'Cardano',
  tokenId: TokenId('lovelace'),
  available: BigNumber(100_000_000n),
  pending: BigNumber(0n),
  displayLongName: 'Cardano',
  displayShortName: 'ADA',
  decimals: 6,
};

const readyState: SendFlowSliceState & { status: 'Form' } = {
  status: 'Form',
  accountId: token.accountId,
  allowRewardsWithdrawal: true,
  blockchainName: 'Cardano',
  blockchainSpecificData: {},
  wallet: {} as AnyWallet,
  confirmButtonEnabled: true,
  fees: [],
  withdrawals: [],
  minimumAmount: BigNumber(1_000_000n),
  serializedTx: 'transaction-for-10-ada',
  form: {
    address: { value: 'recipient', dirty: true, error: null },
    tokenTransfers: [
      {
        token: { value: token },
        amount: { value: BigNumber(10_000_000n), dirty: true, error: null },
      },
    ],
  },
};

const localForm = {
  recipientAddress: 'recipient',
  note: '',
  assetInputValues: [{ tokenId: token.tokenId, value: '10' }],
};

describe('isSendFormReadyForReview', () => {
  it('accepts a built transaction matching every local field', () => {
    expect(isSendFormReadyForReview(readyState, localForm)).toBe(true);
  });

  it.each(['FormPendingValidation', 'FormTxBuilding', 'Summary'] as const)(
    'rejects %s even if an earlier build enabled confirmation',
    status => {
      expect(
        isSendFormReadyForReview({ ...readyState, status }, localForm),
      ).toBe(false);
    },
  );

  it('rejects a closed flow', () => {
    expect(isSendFormReadyForReview({ status: 'Idle' }, localForm)).toBe(false);
  });

  it('rejects a validation or build failure', () => {
    expect(
      isSendFormReadyForReview(
        { ...readyState, confirmButtonEnabled: false },
        localForm,
      ),
    ).toBe(false);
  });

  it('requires a built transaction', () => {
    expect(
      isSendFormReadyForReview({ ...readyState, serializedTx: '' }, localForm),
    ).toBe(false);
  });

  it('rejects an address edit before its debounce reaches Redux', () => {
    expect(
      isSendFormReadyForReview(readyState, {
        ...localForm,
        recipientAddress: 'another-recipient',
      }),
    ).toBe(false);
  });

  it.each(['11', '', 'invalid'])(
    'rejects pending amount input %j despite the previous ready transaction',
    value => {
      expect(
        isSendFormReadyForReview(readyState, {
          ...localForm,
          assetInputValues: [{ tokenId: token.tokenId, value }],
        }),
      ).toBe(false);
    },
  );

  it('compares amounts by token ID and checks every token', () => {
    const secondTokenId = TokenId('second-token');
    const state = {
      ...readyState,
      form: {
        ...readyState.form,
        tokenTransfers: [
          ...readyState.form.tokenTransfers,
          {
            token: { value: { ...token, tokenId: secondTokenId, decimals: 2 } },
            amount: { value: BigNumber(200n), dirty: true, error: null },
          },
        ],
      },
    };
    expect(
      isSendFormReadyForReview(state, {
        ...localForm,
        assetInputValues: [
          { tokenId: secondTokenId, value: '2' },
          ...localForm.assetInputValues,
        ],
      }),
    ).toBe(true);
    expect(
      isSendFormReadyForReview(state, {
        ...localForm,
        assetInputValues: [
          { tokenId: secondTokenId, value: '3' },
          ...localForm.assetInputValues,
        ],
      }),
    ).toBe(false);
  });

  it('accepts locale formatting and trailing zeros without another build', () => {
    const amount = BigNumber(1_234_560_000n);
    const state = {
      ...readyState,
      form: {
        ...readyState.form,
        tokenTransfers: [
          {
            ...readyState.form.tokenTransfers[0],
            amount: { value: amount, dirty: true, error: null },
          },
        ],
      },
    };
    expect(
      isSendFormReadyForReview(state, {
        ...localForm,
        assetInputValues: [
          { tokenId: token.tokenId, value: valueToLocale('1234.56', 3) },
        ],
      }),
    ).toBe(true);
  });

  it('uses state-machine values for untouched rows and ignores removed rows', () => {
    expect(
      isSendFormReadyForReview(readyState, {
        ...localForm,
        assetInputValues: [{ tokenId: 'removed-token', value: '99' }],
      }),
    ).toBe(true);
  });

  it('compares zero-decimal token amounts without scaling', () => {
    const state = {
      ...readyState,
      form: {
        ...readyState.form,
        tokenTransfers: [
          {
            token: { value: { ...token, decimals: 0 } },
            amount: { value: BigNumber(10n), dirty: true, error: null },
          },
        ],
      },
    };
    expect(isSendFormReadyForReview(state, localForm)).toBe(true);
  });

  it('rejects pending note edits, including clearing an existing memo', () => {
    expect(
      isSendFormReadyForReview(readyState, { ...localForm, note: 'new memo' }),
    ).toBe(false);
    const state = {
      ...readyState,
      form: {
        ...readyState.form,
        blockchainSpecific: {
          value: { memo: 'memo', unrelated: true },
          dirty: true,
          error: null,
        },
      },
    };
    expect(isSendFormReadyForReview(state, localForm)).toBe(false);
    expect(
      isSendFormReadyForReview(state, { ...localForm, note: 'memo' }),
    ).toBe(true);
  });

  it('treats an absent local note as empty', () => {
    expect(
      isSendFormReadyForReview(readyState, { ...localForm, note: undefined }),
    ).toBe(true);
  });
});
