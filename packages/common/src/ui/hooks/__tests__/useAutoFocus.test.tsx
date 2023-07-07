import React from 'react';
import '@testing-library/jest-dom';
import { renderHook } from '@testing-library/react-hooks';
import { useAutoFocus } from '../useAutoFocus';
import { Input, InputRef } from 'antd';
import { render } from '@testing-library/react';

describe('useAutoFocus', () => {
  const inputRef = React.createRef<InputRef>();

  test('focuses on the input if autoFocus set to true', async () => {
    const { queryByTestId } = render(<Input ref={inputRef} data-testid="test-input" />);
    const { waitFor } = renderHook(() => useAutoFocus(inputRef, true));
    await waitFor(() => {
      expect(queryByTestId('test-input')).toHaveFocus();
    });
  });

  test('does not focus on the input if autoFocus set to false', async () => {
    const { queryByTestId } = render(<Input ref={inputRef} data-testid="test-input" />);
    const { waitFor } = renderHook(() => useAutoFocus(inputRef, false));

    await expect(
      waitFor(() => {
        expect(queryByTestId('test-input')).toHaveFocus();
      })
    ).rejects.toThrowError('Timed out in waitFor after 1000ms.');
  });
});
