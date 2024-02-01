import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EditAccountDrawer } from './EditAccountDrawer';
import '@testing-library/jest-dom';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: jest.fn() })
}));

const translations = { cancel: '', inputLabel: '', save: '', title: '' };

describe('EditAccountDrawer', () => {
  const onSaveMock = jest.fn();
  const hideMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays default account name', () => {
    render(
      <EditAccountDrawer translations={translations} name="" index={1} visible onSave={onSaveMock} hide={hideMock} />
    );

    expect(screen.getByTestId('edit-account')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-navigation-title')).toHaveTextContent('Account #1');
    expect(screen.getByTestId('edit-account-name-input')).toHaveValue('');
    expect(screen.getByTestId('edit-account-save-btn')).toBeDisabled();
  });

  it('displays correct account name', () => {
    render(
      <EditAccountDrawer
        translations={translations}
        name="Test Account"
        index={1}
        visible
        onSave={onSaveMock}
        hide={hideMock}
      />
    );

    expect(screen.getByTestId('edit-account')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-navigation-title')).toHaveTextContent('Test Account');
    expect(screen.getByTestId('edit-account-name-input')).toHaveValue('Test Account');
    expect(screen.getByTestId('edit-account-save-btn')).toBeDisabled();
  });

  it('updates input value on change and enables save button', () => {
    render(
      <EditAccountDrawer
        translations={translations}
        name="Test Account"
        index={1}
        visible
        onSave={onSaveMock}
        hide={hideMock}
      />
    );

    const input = screen.getByTestId('edit-account-name-input');

    fireEvent.change(input, { target: { value: 'New Account Name' } });
    fireEvent.click(screen.getByTestId('edit-account-save-btn'));

    expect(input).toHaveValue('New Account Name');
    expect(screen.getByTestId('drawer-navigation-title')).toHaveTextContent('Test Account');
    expect(screen.getByTestId('edit-account-save-btn')).toBeEnabled();
    expect(onSaveMock).toHaveBeenCalledWith('New Account Name');
  });

  it('calls hide function when Cancel button is clicked', () => {
    render(
      <EditAccountDrawer
        translations={translations}
        name="Test Account"
        index={1}
        visible
        onSave={onSaveMock}
        hide={hideMock}
      />
    );

    fireEvent.click(screen.getByTestId('edit-account-cancel-btn'));

    expect(hideMock).toHaveBeenCalled();
  });
});
