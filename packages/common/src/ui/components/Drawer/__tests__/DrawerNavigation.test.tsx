import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { DrawerNavigation } from '../DrawerNavigation';

describe('DrawerNavigation', () => {
  test('displays only a title', () => {
    const { queryByText, queryByTestId } = render(<DrawerNavigation title="Test Title" />);
    expect(queryByText('Test Title')).toBeInTheDocument();
    expect(queryByTestId('navigation-button-arrow')).not.toBeInTheDocument();
    expect(queryByTestId('navigation-button-cross')).not.toBeInTheDocument();
  });
  test('shows back arrow button if on click function is defined', () => {
    const onClick = jest.fn();
    const { queryByTestId } = render(<DrawerNavigation onArrowIconClick={onClick} />);
    const backButton = queryByTestId('navigation-button-arrow');
    expect(backButton).toBeInTheDocument();
    backButton && fireEvent.click(backButton);
    expect(onClick).toHaveBeenCalled();
  });
  test('shows close button if on click function is defined', () => {
    const onClick = jest.fn();
    const { queryByTestId } = render(<DrawerNavigation onCloseIconClick={onClick} />);
    const closeButton = queryByTestId('navigation-button-cross');
    expect(closeButton).toBeInTheDocument();
    closeButton && fireEvent.click(closeButton);
    expect(onClick).toHaveBeenCalled();
  });
  test('shows left actions if passed as props instead of back arrow', () => {
    const { queryByTestId } = render(
      <DrawerNavigation leftActions={<div data-testid="test-actions" />} onArrowIconClick={jest.fn()} />
    );
    expect(queryByTestId('test-actions')).toBeInTheDocument();
    expect(queryByTestId('navigation-button-arrow')).not.toBeInTheDocument();
  });
  test('shows right actions if passed as props instead of close button', () => {
    const { queryByTestId } = render(
      <DrawerNavigation rightActions={<div data-testid="test-actions" />} onCloseIconClick={jest.fn()} />
    );
    expect(queryByTestId('test-actions')).toBeInTheDocument();
    expect(queryByTestId('navigation-button-cross')).not.toBeInTheDocument();
  });
});
