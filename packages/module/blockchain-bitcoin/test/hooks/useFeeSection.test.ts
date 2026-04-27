/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeeSection } from '../../src/hooks/useFeeSection';

const mockSetFeeRateOption = vi.fn();
const mockSetCustomFeeRate = vi.fn();
const mockDispatchFormDataChanged = vi.fn();
const mockUseLaceSelector = vi.fn();

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@lace-contract/send-flow', () => ({
  useSendFlow: () => ({
    feeRateOption: 'Average' as const,
    setFeeRateOption: mockSetFeeRateOption,
    customFeeRate: '',
    setCustomFeeRate: mockSetCustomFeeRate,
  }),
  isSendFlowFormStep: (state: {
    status: string;
    form?: { blockchainSpecific?: { value?: object } };
  }) =>
    ['Form', 'FormPendingValidation', 'FormTxBuilding'].includes(state.status),
  isSendFlowClosed: (state: { status: string }) =>
    ['Idle', 'Preparing', 'DiscardingTx'].includes(state.status),
  isSendFlowSuccess: (state: { status: string }) => state.status === 'Success',
}));

vi.mock('../../src/hooks', () => ({
  useLaceSelector: (selector: string): unknown => mockUseLaceSelector(selector),
  useDispatchLaceAction: () => mockDispatchFormDataChanged,
}));

describe('useFeeSection', () => {
  const defaultSendFlowState = {
    status: 'Idle' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseLaceSelector.mockImplementation((selector: string) => {
      if (selector === 'sendFlow.selectSendFlowState') {
        return defaultSendFlowState;
      }
      return undefined;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('return value', () => {
    it('returns feeOptions with four options (Fast, Average, Low, Custom)', () => {
      const { result } = renderHook(() => useFeeSection());

      expect(result.current.feeOptions).toHaveLength(4);
      expect(result.current.feeOptions.map(o => o.value)).toEqual([
        'Fast',
        'Average',
        'Low',
        'Custom',
      ]);
      expect(result.current.feeOptions[0].label).toBe(
        'v2.send-flow.form.fee-options.fast',
      );
      expect(result.current.feeOptions[1].label).toBe(
        'v2.send-flow.form.fee-options.average',
      );
      expect(result.current.feeOptions[2].label).toBe(
        'v2.send-flow.form.fee-options.low',
      );
      expect(result.current.feeOptions[3].label).toBe(
        'v2.send-flow.form.fee-options.custom',
      );
    });

    it('returns feeRateOption and customFeeRate from useSendFlow', () => {
      const { result } = renderHook(() => useFeeSection());

      expect(result.current.feeRateOption).toBe('Average');
      expect(result.current.customFeeRate).toBe('');
    });

    it('returns stable handleFeeOptionChange and handleCustomFeeChange', () => {
      const { result, rerender } = renderHook(() => useFeeSection());
      const handleFeeOptionChangeFirst = result.current.handleFeeOptionChange;
      const handleCustomFeeChangeFirst = result.current.handleCustomFeeChange;
      rerender();
      expect(result.current.handleFeeOptionChange).toBe(
        handleFeeOptionChangeFirst,
      );
      expect(result.current.handleCustomFeeChange).toBe(
        handleCustomFeeChangeFirst,
      );
    });
  });

  describe('handleFeeOptionChange', () => {
    it('calls setFeeRateOption with the selected option', () => {
      const { result } = renderHook(() => useFeeSection());

      act(() => {
        result.current.handleFeeOptionChange('Fast');
      });

      expect(mockSetFeeRateOption).toHaveBeenCalledWith('Fast');
    });

    it('dispatches formDataChanged with fee option after debounce (500ms)', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'sendFlow.selectSendFlowState') {
          return {
            status: 'Form',
            form: { blockchainSpecific: { value: {} } },
          };
        }
        return undefined;
      });
      const { result } = renderHook(() => useFeeSection());
      mockDispatchFormDataChanged.mockClear();

      act(() => {
        result.current.handleFeeOptionChange('Low');
      });
      expect(mockDispatchFormDataChanged).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockDispatchFormDataChanged).toHaveBeenLastCalledWith({
        data: {
          fieldName: 'blockchainSpecific',
          value: {
            feeRate: {
              feeOption: 'Low',
              customFeeRate: 0,
            },
          },
        },
      });
    });
  });

  describe('handleCustomFeeChange', () => {
    it('calls setCustomFeeRate with the value', () => {
      const { result } = renderHook(() => useFeeSection());

      act(() => {
        result.current.handleCustomFeeChange('0.00005');
      });

      expect(mockSetCustomFeeRate).toHaveBeenCalledWith('0.00005');
    });

    it('dispatches formDataChanged with converted custom fee rate after debounce', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'sendFlow.selectSendFlowState') {
          return {
            status: 'Form',
            form: { blockchainSpecific: { value: {} } },
          };
        }
        return undefined;
      });
      const { result } = renderHook(() => useFeeSection());
      mockDispatchFormDataChanged.mockClear();

      act(() => {
        result.current.handleCustomFeeChange('50000');
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockDispatchFormDataChanged).toHaveBeenLastCalledWith({
        data: {
          fieldName: 'blockchainSpecific',
          value: {
            feeRate: {
              feeOption: 'Custom',
              customFeeRate: 0.5,
            },
          },
        },
      });
    });
  });

  describe('initialization when flow opens', () => {
    it('dispatches initial blockchainSpecific when sendFlowState becomes form step', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'sendFlow.selectSendFlowState') {
          return {
            status: 'Form',
            form: { blockchainSpecific: { value: {} } },
          };
        }
        return undefined;
      });
      renderHook(() => useFeeSection());

      expect(mockDispatchFormDataChanged).toHaveBeenCalledWith({
        data: {
          fieldName: 'blockchainSpecific',
          value: {
            feeRate: {
              feeOption: 'Average',
              customFeeRate: 0,
            },
          },
        },
      });
    });

    it('does not dispatch initial value when sendFlowState is Idle', () => {
      mockUseLaceSelector.mockImplementation((selector: string) => {
        if (selector === 'sendFlow.selectSendFlowState') {
          return { status: 'Idle' };
        }
        return undefined;
      });
      renderHook(() => useFeeSection());

      expect(mockDispatchFormDataChanged).not.toHaveBeenCalled();
    });
  });

  describe('selector and action calls', () => {
    it('calls useLaceSelector with sendFlow.selectSendFlowState', () => {
      renderHook(() => useFeeSection());
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'sendFlow.selectSendFlowState',
      );
    });
  });
});
