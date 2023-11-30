import { fireEvent, waitFor, screen } from '@testing-library/react';

export const getNextButton = (): HTMLElement => screen.queryByTestId('wallet-setup-step-btn-next');

export const setupStep = async (): Promise<void> => {
  const nextButton = getNextButton();
  expect(nextButton).toBeDisabled();

  const nameInput = screen.queryByTestId('wallet-name-input');
  fireEvent.change(nameInput, { target: { value: 'My X Wallet' } });

  const password = screen.queryByTestId('wallet-password-verification-input');
  fireEvent.change(password, { target: { value: 'SPECIALZ12345678' } });

  const passwordConfirmation = await screen.findByTestId('wallet-password-confirmation-input');
  fireEvent.change(passwordConfirmation, { target: { value: 'SPECIALZ12345678' } });

  await waitFor(() => expect(nextButton).toBeEnabled());
  fireEvent.click(nextButton);

  await screen.findByText('Keeping your wallet secure');
};

export const mnemonicWords =
  'panther good media point afraid kind reveal infant zoo fluid breeze lyrics congress shrimp seek aerobic turn minimum segment toss honey announce pass rapid'.split(
    ' '
  );

export const fillMnemonic = async (from: number, to: number): Promise<void> => {
  const nextButton = getNextButton();
  const inputs = screen.queryAllByTestId('mnemonic-word-input');

  const words = mnemonicWords.slice(from, to);

  words.forEach((word, index) => {
    const input = inputs[index];
    fireEvent.change(input, { target: { value: word } });
  });

  await waitFor(() => expect(nextButton).toBeEnabled());
  fireEvent.click(nextButton);
};
