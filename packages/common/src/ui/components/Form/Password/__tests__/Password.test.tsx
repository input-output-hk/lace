import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Password } from '../Password';
import { act } from 'react-dom/test-utils';

describe('Password', () => {
  test('starts focused if specified', async () => {
    const { queryByTestId } = render(<Password value="admin123" autoFocus />);
    await waitFor(() => {
      expect(queryByTestId('password-input')).toHaveFocus();
    });
  });
  test('sets initial value with input type as password', () => {
    const { queryByTestId } = render(<Password value="admin123" />);
    const input = queryByTestId('password-input');
    expect(input).toHaveValue('admin123');
    expect(input).toHaveProperty('type', 'password');
  });
  test('displays clean password after clicking on show password icon', () => {
    const { queryByTestId } = render(<Password value="admin123" />);
    const input = queryByTestId('password-input');
    expect(input).toHaveProperty('type', 'password');
    act(() => {
      fireEvent.click(queryByTestId('password-input-show-icon'));
    });
    expect(input).toHaveProperty('type', 'text');
    expect(input).toHaveValue('admin123');
  });
  test('hides password after clicking on hide password icon', () => {
    const { queryByTestId } = render(<Password value="admin123" />);
    const input = queryByTestId('password-input');
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
    const { queryByTestId } = render(<Password value="admin123" error errorMessage="Some error message" />);
    const error = queryByTestId('password-input-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent('Some error message');
  });
});
