/**
 * @vitest-environment jsdom
 */
import { AccountId } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as laceContext from '../../../src/hooks/lace-context';
import { useShouldShowDesignationWarning } from '../../../src/hooks/useShouldShowDesignationWarning';

import type { Address } from '@lace-contract/addresses';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { SendFlowSliceState } from '@lace-contract/send-flow';
import type { Token, TokenId } from '@lace-contract/tokens';
import type { AnyAccount } from '@lace-contract/wallet-repo';

// Mock the hooks
vi.mock('../../../src/hooks/lace-context', () => ({
  useLaceSelector: vi.fn(),
}));

const testAccountId = AccountId('test-account-id');

describe('useShouldShowDesignationWarning', () => {
  const NIGHT_TOKEN_ID = 'test-night-token-id' as TokenId;
  const OTHER_TOKEN_ID = 'test-other-token-id' as TokenId;

  const createMockNightToken = (): Token<MidnightSpecificTokenMetadata> =>
    ({
      tokenId: NIGHT_TOKEN_ID,
      available: BigNumber(1000000n),
      pending: BigNumber(0n),
      accountId: testAccountId,
      address: 'test-address' as Address,
      blockchainName: 'midnight',
      decimals: 6,
      displayLongName: 'NIGHT',
      displayShortName: 'NIGHT',
      metadata: {
        name: 'NIGHT',
        ticker: 'NIGHT',
        decimals: 6,
        blockchainSpecific: {
          tokenType: 'unshielded',
          policyId: 'policy-id',
          assetName: 'asset-name',
          kind: 'unshielded',
        } as unknown as MidnightSpecificTokenMetadata,
      },
    } as unknown as Token<MidnightSpecificTokenMetadata>);

  const createMockDustGenerationDetails = (hasActiveDust: boolean) =>
    hasActiveDust
      ? ({
          [testAccountId]: {
            currentValue: 1000n,
            maxCap: 2000n,
            rate: 1n,
          },
        } as const)
      : undefined;

  const createMockSendFlowState = (
    status: SendFlowSliceState['status'],
    tokenTransfers: Array<{ token: { value: { tokenId: string } } }> = [],
    blockchainSpecificData: { flowType?: 'dust-designation' | 'send' } = {},
  ): SendFlowSliceState => {
    const baseState = { status };

    if (
      status === 'Form' ||
      status === 'FormPendingValidation' ||
      status === 'FormTxBuilding' ||
      status === 'Summary' ||
      status === 'SummaryAwaitingConfirmation' ||
      status === 'Processing' ||
      status === 'SelectToken'
    ) {
      return {
        ...baseState,
        accountId: testAccountId,
        blockchainName: 'midnight',
        blockchainSpecificData,
        confirmButtonEnabled: false,
        fees: [],
        form: {
          address: {
            dirty: false,
            error: null,
            value: '',
          },
          tokenTransfers,
        },
        serializedTx: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        wallet: {} as any,
      } as SendFlowSliceState;
    }

    if (status === 'Success') {
      return {
        ...baseState,
        blockchainName: 'midnight',
        blockchainSpecificData: {},
        confirmButtonEnabled: true,
        fees: [],
        form: {
          address: {
            dirty: false,
            error: null,
            value: '',
          },
          tokenTransfers,
        },
        txId: 'test-tx-id',
      } as SendFlowSliceState;
    }

    if (status === 'Failure') {
      return {
        ...baseState,
        accountId: testAccountId,
        blockchainName: 'midnight',
        blockchainSpecificData: {},
        confirmButtonEnabled: true,
        fees: [],
        form: {
          address: {
            dirty: false,
            error: null,
            value: '',
          },
          tokenTransfers,
        },
        serializedTx: '',
        errorTranslationKeys: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        wallet: {} as any,
      } as SendFlowSliceState;
    }

    return baseState as SendFlowSliceState;
  };

  const sendFlowAccountId = testAccountId;

  const createMockMidnightAccount = (): AnyAccount =>
    ({
      accountId: sendFlowAccountId,
      blockchainName: 'Midnight',
      blockchainNetworkId: 'preview',
      networkType: 'testnet',
      walletId: 'test-wallet-id',
      metadata: {},
      blockchainSpecific: {},
    } as AnyAccount);

  const mockState = {
    networkId: 'Preview' as const,
    dustGenerationDetails: undefined as
      | Record<
          AccountId,
          { currentValue: bigint; maxCap: bigint; rate: bigint }
        >
      | undefined,
    nightToken: undefined as Token<MidnightSpecificTokenMetadata> | undefined,
    sendFlowState: undefined as SendFlowSliceState | undefined,
    accounts: [createMockMidnightAccount()] as AnyAccount[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(laceContext.useLaceSelector).mockImplementation(
      (selector: string) => {
        if (selector === 'midnightContext.selectNetworkId')
          return mockState.networkId;
        if (selector === 'midnightContext.selectDustGenerationDetails')
          return mockState.dustGenerationDetails;
        if (selector === 'wallets.selectActiveNetworkAccounts')
          return mockState.accounts;
        if (selector === 'tokens.selectTokenById') return mockState.nightToken;
        if (selector === 'tokens.selectTokensGroupedByAccount') return {};
        if (selector === 'network.selectNetworkType') return 'testnet';
        if (selector === 'sendFlow.selectSendFlowState')
          return mockState.sendFlowState;
        return undefined;
      },
    );
  });

  describe('when all conditions are met', () => {
    it('should return true when sending NIGHT with active designation', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(true);
    });

    it('should return false for designation flow (NIGHT is designated, not sent)', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState(
        'Form',
        [{ token: { value: { tokenId: NIGHT_TOKEN_ID } } }],
        { flowType: 'dust-designation' },
      );

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return true for Form step states (Form, FormPendingValidation, FormTxBuilding)', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);

      const formStepStatuses: SendFlowSliceState['status'][] = [
        'Form',
        'FormPendingValidation',
        'FormTxBuilding',
      ];

      formStepStatuses.forEach(status => {
        mockState.sendFlowState = createMockSendFlowState(status, [
          { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
        ]);

        const { result } = renderHook(() => useShouldShowDesignationWarning());

        expect(result.current).toBe(true);
      });
    });
  });

  describe('when not on Form step', () => {
    it('should return false when flow is in Idle state', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Idle');

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when flow is in Preparing state', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Preparing');

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when flow is in DiscardingTx state', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('DiscardingTx');

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when sendFlowState has no form property', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = { status: 'Idle' } as SendFlowSliceState;

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });
  });

  describe('when token data is missing', () => {
    it('should return false when nightToken is undefined', () => {
      mockState.nightToken = undefined;
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when dustGenerationDetails is undefined', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = undefined;
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when both nightToken and dustGenerationDetails are undefined', () => {
      mockState.nightToken = undefined;
      mockState.dustGenerationDetails = undefined;
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });
  });

  describe('when NIGHT token is not being sent', () => {
    it('should return false when sending a different token', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: OTHER_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when tokenTransfers is empty', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', []);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return true when NIGHT is one of multiple tokens being sent', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: OTHER_TOKEN_ID } } },
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(true);
    });
  });

  describe('when dust status is empty', () => {
    it('should return false when dustGenerationDetails is undefined', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = undefined;
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });

    it('should return false when dust has zero values (empty status)', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = {
        [testAccountId]: {
          currentValue: 0n,
          maxCap: 0n,
          rate: 0n,
        },
      };
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return false when an error occurs during calculation', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        // @ts-expect-error Testing error case with invalid structure
        { token: null },
      ]);

      const { result } = renderHook(() => useShouldShowDesignationWarning());

      expect(result.current).toBe(false);
    });
  });

  describe('memoization', () => {
    it('should memoize result when dependencies do not change', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result, rerender } = renderHook(() =>
        useShouldShowDesignationWarning(),
      );

      const isInitialResultTrue = result.current;
      expect(isInitialResultTrue).toBe(true);

      // Rerender without changing dependencies
      rerender();

      expect(result.current).toBe(true);
      expect(result.current).toBe(isInitialResultTrue); // Same reference due to memoization
    });

    it('should recalculate when sendFlowState changes', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result, rerender } = renderHook(() =>
        useShouldShowDesignationWarning(),
      );

      expect(result.current).toBe(true);

      // Update sendFlowState
      mockState.sendFlowState = createMockSendFlowState('Idle');
      rerender();

      expect(result.current).toBe(false);
    });

    it('should recalculate when nightToken changes', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result, rerender } = renderHook(() =>
        useShouldShowDesignationWarning(),
      );

      expect(result.current).toBe(true);

      // Update nightToken to undefined
      mockState.nightToken = undefined;
      rerender();

      expect(result.current).toBe(false);
    });

    it('should recalculate when dustGenerationDetails changes', () => {
      mockState.nightToken = createMockNightToken();
      mockState.dustGenerationDetails = createMockDustGenerationDetails(true);
      mockState.sendFlowState = createMockSendFlowState('Form', [
        { token: { value: { tokenId: NIGHT_TOKEN_ID } } },
      ]);

      const { result, rerender } = renderHook(() =>
        useShouldShowDesignationWarning(),
      );

      expect(result.current).toBe(true);

      // Update dustGenerationDetails to empty
      mockState.dustGenerationDetails = undefined;
      rerender();

      expect(result.current).toBe(false);
    });
  });
});
