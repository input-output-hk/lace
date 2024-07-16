/* eslint-disable @typescript-eslint/no-empty-function */
import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { i18n } from '../../../../lib/i18n';
import { UnlockWallet, UnlockWalletProps } from '../UnlockWallet';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@providers', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers'),
  useAnalyticsContext: jest.fn().mockReturnValue({ sendEventToPostHog: jest.fn() })
}));

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Testing UnlockWallet component', () => {
  window.ResizeObserver = ResizeObserver;
  const props: UnlockWalletProps = {
    onUnlock: jest.fn(),
    passwordInput: { value: '', handleChange: jest.fn() }
  };

  const WrappedUnlockWallet = (unlockProps: UnlockWalletProps) => (
    <MemoryRouter initialEntries={['/']}>
      <I18nextProvider i18n={i18n}>
        <UnlockWallet {...unlockProps} />
      </I18nextProvider>
    </MemoryRouter>
  );

  const passwordInputTestId = 'password-input';

  test('should disable the button if unlockButtonDisabled prop is passed', async () => {
    const { findByTestId } = render(<WrappedUnlockWallet {...props} unlockButtonDisabled />);

    const button = await findByTestId('unlock-button');

    expect(button).toBeVisible();
    expect(button).toBeDisabled();
  });

  test('should render a password input and an unlock button', async () => {
    const { findByTestId, findByText } = render(<WrappedUnlockWallet {...props} />);

    const button = await findByText('Unlock');
    const input = await findByTestId(passwordInputTestId);

    expect(button).toBeVisible();
    expect(button).toBeEnabled();
    expect(input).toBeVisible();
    expect(input).toBeEnabled();
    expect(input).toHaveAttribute('type', 'password');
  });

  test('should have the password value in the input', async () => {
    const { findByTestId } = render(<WrappedUnlockWallet {...props} passwordInput={{ value: 'testpass' }} />);

    const input = await findByTestId(passwordInputTestId);
    expect(input).toBeVisible();
    expect(input).toHaveValue('testpass');
  });

  test('should display an error message if the password is invalid', async () => {
    const { findByText } = render(<WrappedUnlockWallet {...props} passwordInput={{ invalidPass: true }} />);

    const error = await findByText('Invalid password');
    expect(error).toBeVisible();
  });

  test('should execute the onUnlock function when the button is clicked', async () => {
    const { findByText } = render(<WrappedUnlockWallet {...props} />);

    const button = await findByText('Unlock');
    fireEvent.click(button);

    expect(props.onUnlock).toHaveBeenCalled();
  });

  test('should execute the handleChange function when on input change', async () => {
    const { findByTestId } = render(<WrappedUnlockWallet {...props} />);

    const input = await findByTestId(passwordInputTestId);
    fireEvent.change(input, { target: { value: 'something' } });

    expect(props.passwordInput.handleChange).toHaveBeenCalled();
  });
});
