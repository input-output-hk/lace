import { TokenId } from '@lace-contract/tokens';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import {
  getTransactionDetails,
  type TransactionDetails,
} from '../../../src/pages/SendResult/getTransactionDetails';

import type { Address } from '@lace-contract/addresses';
import type { SendFlowSliceState } from '@lace-contract/send-flow';
import type { Token } from '@lace-contract/tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

const createToken = (overrides: Partial<Token> = {}): Token =>
  ({
    accountId: 'acc' as AccountId,
    address: 'addr' as Address,
    blockchainName: 'Cardano',
    tokenId: TokenId('token-1'),
    available: BigNumber(100n),
    pending: BigNumber(0n),
    displayLongName: 'Test Token',
    displayShortName: 'TT',
    decimals: 6,
    metadata: { image: 'https://example.com/img.png' },
    ...overrides,
  } as Token);

const createSuccessState = (
  overrides: Partial<Extract<SendFlowSliceState, { status: 'Success' }>> = {},
): Extract<SendFlowSliceState, { status: 'Success' }> =>
  ({
    status: 'Success',
    blockchainName: 'Cardano',
    blockchainSpecificData: {},
    confirmButtonEnabled: true,
    txId: 'tx-123',
    form: {
      address: {
        dirty: true,
        error: null,
        value: 'addr1_input_value',
      },
      tokenTransfers: [
        {
          amount: {
            dirty: true,
            error: null,
            value: BigNumber(1_000_000n),
          },
          token: { value: createToken() },
        },
      ],
    },
    fees: [
      {
        tokenId: TokenId('token-1'),
        amount: BigNumber(100_000n),
      },
    ],
    ...overrides,
  } as Extract<SendFlowSliceState, { status: 'Success' }>);

describe('getTransactionDetails', () => {
  it('returns undefined when state is not Success', () => {
    expect(
      getTransactionDetails({ status: 'Idle' } as SendFlowSliceState),
    ).toBe(undefined);
    expect(
      getTransactionDetails({ status: 'Processing' } as SendFlowSliceState),
    ).toBe(undefined);
    expect(
      getTransactionDetails({ status: 'Failure' } as SendFlowSliceState),
    ).toBe(undefined);
    expect(
      getTransactionDetails({ status: 'Form' } as SendFlowSliceState),
    ).toBe(undefined);
  });

  it('returns undefined when form.tokenTransfers is empty', () => {
    const state = createSuccessState({
      form: {
        ...createSuccessState().form,
        tokenTransfers: [],
        address: {
          dirty: true,
          error: null,
          value: 'addr1_xyz',
        },
      },
    });
    expect(getTransactionDetails(state)).toBe(undefined);
  });

  it('returns undefined when form.address.value is empty', () => {
    const state = createSuccessState({
      form: {
        ...createSuccessState().form,
        address: {
          dirty: false,
          error: null,
          value: '',
        },
      },
    });
    expect(getTransactionDetails(state)).toBe(undefined);
  });

  it('returns correct sentTokens with amount conversion', () => {
    const token = createToken({
      tokenId: TokenId('token-1'),
      displayShortName: 'ADA',
      decimals: 6,
    });
    const state = createSuccessState({
      form: {
        address: {
          dirty: true,
          error: null,
          value: 'addr1_recipient',
        },
        tokenTransfers: [
          {
            amount: {
              dirty: true,
              error: null,
              value: BigNumber(1_500_000n),
            },
            token: { value: token },
          },
        ],
      },
      fees: [{ tokenId: TokenId('token-1'), amount: BigNumber(50_000n) }],
    });

    const result = getTransactionDetails(state) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.sentTokens).toHaveLength(1);
    expect(result.sentTokens[0]).toMatchObject({
      token: {
        tokenId: 'token-1',
        displayShortName: 'ADA',
        decimals: 6,
        metadata: { image: 'https://example.com/img.png' },
      },
      amount: '1.5',
    });
  });

  it('uses resolvedAddress when it is a string', () => {
    const resolvedAddr = 'addr1_resolved_from_alias';
    const state = createSuccessState({
      form: {
        ...createSuccessState().form,
        address: {
          dirty: true,
          error: null,
          value: 'alias@example.com',
          resolvedAddress: resolvedAddr as Address,
        },
      },
    });

    const result = getTransactionDetails(state) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.recipientAddress).toBe(resolvedAddr);
  });

  it('falls back to form.address.value when resolvedAddress is not a string', () => {
    const inputValue = 'addr1_raw_input';
    const state = createSuccessState({
      form: {
        ...createSuccessState().form,
        address: {
          dirty: true,
          error: null,
          value: inputValue,
          resolvedAddress: undefined,
        },
      },
    });

    const result = getTransactionDetails(state) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.recipientAddress).toBe(inputValue);
  });

  it('returns multiple sent tokens correctly', () => {
    const token1 = createToken({
      tokenId: TokenId('token-1'),
      displayShortName: 'ADA',
      decimals: 6,
    });
    const token2 = createToken({
      tokenId: TokenId('token-2'),
      displayShortName: 'USDT',
      decimals: 2,
    });
    const state = createSuccessState({
      form: {
        address: {
          dirty: true,
          error: null,
          value: 'addr1_recipient',
        },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(2_000_000n) },
            token: { value: token1 },
          },
          {
            amount: { dirty: true, error: null, value: BigNumber(150n) },
            token: { value: token2 },
          },
        ],
      },
      fees: [{ tokenId: TokenId('token-1'), amount: BigNumber(100_000n) }],
    });

    const result = getTransactionDetails(state) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.sentTokens).toHaveLength(2);
    expect(result.sentTokens[0]).toMatchObject({
      token: { tokenId: 'token-1', displayShortName: 'ADA' },
      amount: '2',
    });
    expect(result.sentTokens[1]).toMatchObject({
      token: { tokenId: 'token-2', displayShortName: 'USDT' },
      amount: '1.5',
    });
  });

  it('computes fee from first fee entry when nativeTokenInfo is provided', () => {
    const token = createToken({
      tokenId: TokenId('lovelace'),
      displayShortName: 'ADA',
      decimals: 6,
    });
    const state = createSuccessState({
      form: {
        address: { dirty: true, error: null, value: 'addr1_xyz' },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(1_000_000n) },
            token: { value: token },
          },
        ],
      },
      fees: [{ tokenId: TokenId('lovelace'), amount: BigNumber(250_000n) }],
    });

    const result = getTransactionDetails(state, {
      nativeTokenInfo: {
        tokenId: 'lovelace',
        decimals: 6,
        displayShortName: 'ADA',
      },
    }) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.fee).toBe('0.25 ADA');
  });

  it('uses nativeTokenInfo and zero amount when fees array is empty', () => {
    const token = createToken({
      tokenId: TokenId('token-1'),
      displayShortName: 'TT',
      decimals: 2,
    });
    const state = createSuccessState({
      form: {
        address: { dirty: true, error: null, value: 'addr1_xyz' },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(100n) },
            token: { value: token },
          },
        ],
      },
      fees: [],
    });

    const result = getTransactionDetails(state, {
      nativeTokenInfo: {
        tokenId: 'token-1',
        decimals: 2,
        displayShortName: 'TT',
      },
    }) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.fee).toBe('0 TT');
  });

  it('uses feeTokenId as fee token name when fee token not in tokenTransfers', () => {
    const token = createToken({
      tokenId: TokenId('sent-token'),
      displayShortName: 'SENT',
      decimals: 2,
    });
    const state = createSuccessState({
      form: {
        address: { dirty: true, error: null, value: 'addr1_xyz' },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(100n) },
            token: { value: token },
          },
        ],
      },
      fees: [
        {
          tokenId: TokenId('fee-token-not-in-transfers'),
          amount: BigNumber(50n),
        },
      ],
    });

    const result = getTransactionDetails(state) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.fee).toBe('50 fee-token-not-in-transfers');
  });

  it('uses nativeTokenInfo when fee token differs from sent token (e.g. Midnight DUST)', () => {
    const sentToken = createToken({
      tokenId: TokenId('shielded-token'),
      displayShortName: 'SHD',
      decimals: 2,
    });
    const state = createSuccessState({
      form: {
        address: { dirty: true, error: null, value: 'addr1_xyz' },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(100n) },
            token: { value: sentToken },
          },
        ],
      },
      fees: [
        {
          tokenId: TokenId('dust'),
          amount: BigNumber(1_000_000_000_000_000n),
        },
      ],
    });
    const nativeTokenInfo = {
      tokenId: 'dust',
      decimals: 15,
      displayShortName: 'DUST',
    };

    const result = getTransactionDetails(state, {
      nativeTokenInfo,
    }) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.fee).toBe('1 DUST');
  });

  it('handles token with undefined decimals (nativeTokenInfo provides decimals)', () => {
    const token = createToken({
      tokenId: TokenId('token-1'),
      displayShortName: 'TT',
      decimals: undefined,
    });
    const state = createSuccessState({
      form: {
        address: { dirty: true, error: null, value: 'addr1_xyz' },
        tokenTransfers: [
          {
            amount: { dirty: true, error: null, value: BigNumber(100n) },
            token: { value: token },
          },
        ],
      },
      fees: [{ tokenId: TokenId('token-1'), amount: BigNumber(10n) }],
    });

    const result = getTransactionDetails(state, {
      nativeTokenInfo: {
        tokenId: 'token-1',
        decimals: 0,
        displayShortName: 'TT',
      },
    }) as TransactionDetails;

    expect(result).toBeDefined();
    expect(result.sentTokens[0].amount).toBe('100');
    expect(result.fee).toBe('10 TT');
  });
});
