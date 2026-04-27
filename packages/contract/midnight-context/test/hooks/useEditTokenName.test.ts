/**
 * @vitest-environment jsdom
 */
import { TokenId } from '@lace-contract/tokens';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditTokenName } from '../../src/hooks/useEditTokenName';

import type {
  EditTokenNameToken,
  UseEditTokenNameProps,
} from '../../src/hooks/useEditTokenName';

describe('useEditTokenName', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();
  const mockGetErrorMessage = vi.fn();

  const defaultToken: EditTokenNameToken = {
    tokenId: TokenId('token-123'),
    metadata: {
      name: 'Test Token',
      ticker: 'TST',
      decimals: 6,
      blockchainSpecific: {},
    },
    displayLongName: 'Test Token',
    displayShortName: 'TST',
  };

  const defaultProps: UseEditTokenNameProps = {
    token: defaultToken,
    takenTokenNames: [],
    onSave: mockOnSave,
    onClose: mockOnClose,
    getErrorMessage: mockGetErrorMessage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetErrorMessage.mockReturnValue(undefined);
  });

  describe('initial state', () => {
    it('initializes with token display names when metadata exists', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      expect(result.current.tokenFullName).toBe('Test Token');
      expect(result.current.tokenShortName).toBe('TST');
    });

    it('initializes with empty strings when token has no metadata name', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        token: {
          ...defaultToken,
          metadata: { decimals: 6, blockchainSpecific: {} },
          displayLongName: 'Unnamed',
          displayShortName: 'UNK',
        },
      };

      const { result } = renderHook(() => useEditTokenName(props));

      expect(result.current.tokenFullName).toBe('');
      expect(result.current.tokenShortName).toBe('');
    });

    it('initializes with empty strings when token is null', () => {
      const props = {
        ...defaultProps,
        token: null,
      };

      const { result } = renderHook(() => useEditTokenName(props));

      expect(result.current.tokenFullName).toBe('');
      expect(result.current.tokenShortName).toBe('');
    });
  });

  describe('setTokenFullName and setTokenShortName', () => {
    it('updates tokenFullName when setTokenFullName is called', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenFullName('New Name');
      });

      expect(result.current.tokenFullName).toBe('New Name');
    });

    it('updates tokenShortName when setTokenShortName is called', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenShortName('NEW');
      });

      expect(result.current.tokenShortName).toBe('NEW');
    });
  });

  describe('validation errors', () => {
    it('calls getErrorMessage with tokenFullName and returns the error', () => {
      mockGetErrorMessage.mockImplementation((name: string) =>
        name === 'forbidden' ? 'This name is not allowed' : undefined,
      );

      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenFullName('forbidden');
      });

      expect(result.current.tokenFullNameError).toBe(
        'This name is not allowed',
      );
    });

    it('calls getErrorMessage with tokenShortName and returns the error', () => {
      mockGetErrorMessage.mockImplementation((name: string) =>
        name === 'BAD' ? 'This ticker is not allowed' : undefined,
      );

      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenShortName('BAD');
      });

      expect(result.current.tokenShortNameError).toBe(
        'This ticker is not allowed',
      );
    });

    it('passes excluded names list to getErrorMessage without current token names', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        takenTokenNames: ['Test Token', 'TST', 'Other Token'],
      };

      const { result } = renderHook(() => useEditTokenName(props));

      act(() => {
        result.current.setTokenFullName('Test Token');
      });

      expect(mockGetErrorMessage).toHaveBeenLastCalledWith('Test Token', [
        'Other Token',
      ]);
    });
  });

  describe('isSaveDisabled', () => {
    it('returns true when tokenFullName is empty', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        token: {
          ...defaultToken,
          metadata: { decimals: 6, blockchainSpecific: {} },
        },
      };

      const { result } = renderHook(() => useEditTokenName(props));

      expect(result.current.isSaveDisabled).toBe(true);
    });

    it('returns true when tokenShortName is empty', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        token: {
          ...defaultToken,
          metadata: { decimals: 6, blockchainSpecific: {} },
        },
      };

      const { result } = renderHook(() => useEditTokenName(props));

      act(() => {
        result.current.setTokenFullName('Valid Name');
      });

      expect(result.current.isSaveDisabled).toBe(true);
    });

    it('returns true when name is a taken name', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        takenTokenNames: ['taken'],
        token: {
          ...defaultToken,
          metadata: { decimals: 6, blockchainSpecific: {} },
        },
      };

      const { result } = renderHook(() => useEditTokenName(props));

      act(() => {
        result.current.setTokenFullName('taken');
        result.current.setTokenShortName('NEW');
      });

      expect(result.current.isSaveDisabled).toBe(true);
    });

    it('returns false when both names are valid', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      expect(result.current.isSaveDisabled).toBe(false);
    });

    it('excludes current token names from taken names check', () => {
      const props = {
        ...defaultProps,
        takenTokenNames: ['Test Token', 'TST'],
      };

      const { result } = renderHook(() => useEditTokenName(props));

      expect(result.current.isSaveDisabled).toBe(false);
    });
  });

  describe('handleSave', () => {
    it('calls onSave with trimmed values and metadata', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenFullName('  New Name  ');
        result.current.setTokenShortName('  NEW  ');
      });

      act(() => {
        result.current.handleSave();
      });

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'New Name',
        ticker: 'NEW',
        tokenId: TokenId('token-123'),
        decimals: 6,
        blockchainSpecific: {},
      });
    });

    it('resets state after save', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.handleSave();
      });

      expect(result.current.tokenFullName).toBe('');
      expect(result.current.tokenShortName).toBe('');
    });

    it('does not call onSave when isSaveDisabled is true', () => {
      const props: UseEditTokenNameProps = {
        ...defaultProps,
        token: {
          ...defaultToken,
          metadata: { decimals: 6, blockchainSpecific: {} },
        },
      };

      const { result } = renderHook(() => useEditTokenName(props));

      act(() => {
        result.current.handleSave();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('does not call onSave when token is null', () => {
      const props = {
        ...defaultProps,
        token: null,
      };

      const { result } = renderHook(() => useEditTokenName(props));

      act(() => {
        result.current.handleSave();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('handleClose', () => {
    it('calls onClose', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.handleClose();
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets state when closed', () => {
      const { result } = renderHook(() => useEditTokenName(defaultProps));

      act(() => {
        result.current.setTokenFullName('Changed');
        result.current.setTokenShortName('CHG');
      });

      act(() => {
        result.current.handleClose();
      });

      expect(result.current.tokenFullName).toBe('');
      expect(result.current.tokenShortName).toBe('');
    });
  });

  describe('token changes', () => {
    it('updates state when token changes', () => {
      const { result, rerender } = renderHook(
        (props: UseEditTokenNameProps) => useEditTokenName(props),
        { initialProps: defaultProps },
      );

      const newProps: UseEditTokenNameProps = {
        ...defaultProps,
        token: {
          tokenId: TokenId('token-456'),
          metadata: {
            name: 'Another Token',
            ticker: 'ATK',
            decimals: 6,
            blockchainSpecific: {},
          },
          displayLongName: 'Another Token',
          displayShortName: 'ATK',
        },
      };

      rerender(newProps);

      expect(result.current.tokenFullName).toBe('Another Token');
      expect(result.current.tokenShortName).toBe('ATK');
    });
  });
});
