import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { Input } from '../Input';
import { act } from 'react-dom/test-utils';

describe('Input', () => {
  test('initial value is an empty string', () => {
    const { queryByTestId } = render(<Input dataTestId="input-test" />);
    expect(queryByTestId('input-test')).toHaveValue('');
  });
  test('on input change value is updated and onChange function prop is called', () => {
    const onChange = jest.fn();
    const { queryByTestId } = render(<Input dataTestId="input-test" onChange={onChange} />);
    const input = queryByTestId('input-test');
    expect(input).toHaveValue('');
    act(() => {
      input && fireEvent.change(input, { target: { value: 'new value' } });
    });
    expect(input).toHaveValue('new value');
    expect(onChange).toHaveBeenCalled();
  });
  test('starts focused if specified', async () => {
    const { queryByTestId } = render(<Input focus dataTestId="input-test" />);
    await waitFor(() => {
      expect(queryByTestId('input-test')).toHaveFocus();
    });
  });
});
