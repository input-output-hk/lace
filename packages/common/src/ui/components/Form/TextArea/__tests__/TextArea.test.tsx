import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { TextArea } from '../TextArea';
import { act } from 'react-dom/test-utils';

describe('TextArea', () => {
  test('initial value is an empty string', () => {
    const { queryByTestId } = render(<TextArea dataTestId="text-area-test" />);
    expect(queryByTestId('text-area-test-input')).toHaveValue('');
  });
  test('on input change value is updated and onChange function prop is called', () => {
    const onChange = jest.fn();
    const { queryByTestId } = render(<TextArea dataTestId="text-area-test" onChange={onChange} />);
    const area = queryByTestId('text-area-test-input');
    expect(area).toHaveValue('');
    act(() => {
      area && fireEvent.change(area, { target: { value: 'new value' } });
    });
    expect(area).toHaveValue('new value');
    expect(onChange).toHaveBeenCalled();
  });
  test('on blur calls onBlur function prop', async () => {
    const onBlur = jest.fn();
    const { queryByTestId } = render(<TextArea dataTestId="text-area-test" onBlur={onBlur} />);
    await waitFor(() => {
      const area = queryByTestId('text-area-test-input');
      area && fireEvent.blur(area);
    });
    expect(onBlur).toHaveBeenCalled();
  });
  test('displays label if passed as props', () => {
    const { queryByText } = render(<TextArea label="This is a label" dataTestId="text-area-test" />);
    expect(queryByText('This is a label')).toBeInTheDocument();
  });
});
