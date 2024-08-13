import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Password } from '../Password';
import { act } from 'react-dom/test-utils';
import { OnPasswordChange } from '@input-output-hk/lace-ui-toolkit';

const onChange: OnPasswordChange = () => void 0;

describe('Password', () => {
  test('starts focused if specified', async () => {
    const { queryByTestId } = render(<Password autoFocus onChange={onChange} />);
    await waitFor(() => {
      expect(queryByTestId('password-input')).toHaveFocus();
    });
  });
  test('uses input type as password', () => {
    const { queryByTestId } = render(<Password onChange={onChange} />);
    const input = queryByTestId('password-input');
    expect(input).toHaveProperty('type', 'password');
  });
  test('displays clean password after clicking on show password icon', () => {
    const { queryByTestId } = render(<Password onChange={onChange} />);
    const input = queryByTestId('password-input');
    (input as HTMLInputElement).value = 'admin123';
    expect(input).toHaveProperty('type', 'password');
    act(() => {
      fireEvent.click(queryByTestId('password-input-show-icon'));
    });
    expect(input).toHaveProperty('type', 'text');
    expect(input).toHaveValue('admin123');
  });
  test('hides password after clicking on hide password icon', () => {
    const { queryByTestId } = render(<Password onChange={onChange} />);
    const input = queryByTestId('password-input');
    (input as HTMLInputElement).value = 'admin123';
    expect(input).toHaveProperty('type', 'password');
    act(() => {
      fireEvent.click(queryByTestId('password-input-show-icon'));
    });
    expect(input).toHaveProperty('type', 'text');
    act(() => {
      fireEvent.click(queryByTestId('password-input-hide-icon'));
    });
    expect(input).toHaveProperty('type', 'password');
  });
  test('displays an error message', async () => {
    const { queryByTestId } = render(<Password onChange={onChange} error errorMessage="Some error message" />);
    const error = queryByTestId('password-input-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent('Some error message');
  });
});
