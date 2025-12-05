import React from 'react';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetInputRow } from '../AssetInputRow';
import { AssetInputProps } from '../AssetInput';

describe('AssetInputRow', () => {
  const props = {
    getErrorMessage: jest.fn(),
    coin: {},
    setFocusInput: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    onChange: jest.fn(),
    maxDecimals: 3,
    focused: true,
    displayValue: '123,456,78.901',
    compactValue: '12.34M'
  } as unknown as AssetInputProps;
  beforeEach(async () => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });
  describe('renders', () => {
    test('correct display value in case it was focused using tab key event', async () => {
      render(<AssetInputRow rowsLength={0} idx={0} {...props} />);
      const input = screen.queryByTestId('coin-configure-input') as HTMLInputElement;

      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();

      expect(input).toHaveFocus();

      fireEvent.change(input, { target: { value: '12345678.901' } });

      await waitFor(() => {
        expect(input.value).toBe(props.displayValue);
      });
    });
  });
});
