import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { Search } from '../Search';
import { act } from 'react-dom/test-utils';

describe('Search', () => {
  test('sets initial value', () => {
    const { queryByTestId } = render(<Search value="test value" />);
    expect(queryByTestId('search-input')).toHaveValue('test value');
  });
  test('focuses input on container click', () => {
    const { queryByTestId } = render(<Search />);
    expect(queryByTestId('search-input')).not.toHaveFocus();
    act(() => {
      fireEvent.click(queryByTestId('search-input-container'));
    });
    expect(queryByTestId('search-input')).toHaveFocus();
  });

  test('call onInputBlur function prop on search input blur', () => {
    const onInputBlur = jest.fn();
    const { queryByTestId } = render(<Search onInputBlur={onInputBlur} />);
    act(() => {
      fireEvent.blur(queryByTestId('search-input'));
    });
    expect(onInputBlur).toHaveBeenCalled();
  });
  test('call onInputFocus function prop on search input focus', () => {
    const onInputFocus = jest.fn();
    const { queryByTestId } = render(<Search onInputFocus={onInputFocus} />);
    act(() => {
      fireEvent.focus(queryByTestId('search-input'));
    });
    expect(onInputFocus).toHaveBeenCalled();
  });
  test('displays clear input button and calls onClearButtonClick when clicked', () => {
    const onClearButtonClick = jest.fn();
    const { queryByTestId } = render(<Search showClear onClearButtonClick={onClearButtonClick} />);
    const clearButton = queryByTestId('address-book-btn');
    expect(clearButton).toBeInTheDocument();
    act(() => {
      fireEvent.click(clearButton);
    });
    expect(onClearButtonClick).toHaveBeenCalled();
  });
  test('displays loader icon if loading', () => {
    const { queryByTestId } = render(<Search loading />);
    expect(queryByTestId('search-loader')).toBeInTheDocument();
  });
  test('displays search icon', () => {
    const { queryByTestId } = render(<Search withSearchIcon />);
    expect(queryByTestId('search-icon')).toBeInTheDocument();
  });
  test('displays a custom icon', () => {
    const { queryByTestId } = render(<Search customIcon={<svg data-testid="custom-item-test" />} />);
    expect(queryByTestId('custom-item-test')).toBeInTheDocument();
  });
});
