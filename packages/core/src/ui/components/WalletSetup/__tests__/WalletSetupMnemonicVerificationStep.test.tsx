/* eslint-disable no-magic-numbers */
import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, within, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletSetupMnemonicVerificationStep } from '../WalletSetupMnemonicVerificationStep';
import { useEffect } from 'react';

const Test = () => {
  useEffect(() => {
    const handleEnterKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Enter') {
        const nextBnt: HTMLButtonElement = document.querySelector('[data-testid="wallet-setup-step-btn-next"]');

        if (nextBnt && !nextBnt.getAttribute('disabled')) {
          nextBnt.click();
        }
      }
    };
    document.addEventListener('keydown', handleEnterKeyPress);
    return () => {
      document.removeEventListener('keydown', handleEnterKeyPress);
    };
  }, []);

  const [mnemonic, setMnemonic] = React.useState<string[]>([
    ...'weapon shock brick category tragic grocery filter '.split(' '),
    ...Array.from({ length: 16 }).map(() => '')
  ]);

  return (
    <WalletSetupMnemonicVerificationStep
      mnemonic={mnemonic}
      onChange={setMnemonic}
      onCancel={jest.fn()}
      onSubmit={jest.fn()}
      translations={{
        enterPassphrase: 'Enter passphrase',
        passphraseError: 'Passphrase error'
      }}
      setIsBackToMnemonic={jest.fn()}
      isBackToMnemonic={false}
      isSubmitEnabled
    />
  );
};

const findInputByIndex = async (index: number): Promise<HTMLElement> => {
  const container1th = await screen.findByTestId(`mnemonic-word-input-${index}`);
  return within(container1th).getByTestId('mnemonic-word-input');
};

describe('<WalletSetupMnemonicVerificationStep>', () => {
  it('should render IogSwitch component', async () => {
    const user = userEvent.setup();
    render(<Test />);

    const input1th = await findInputByIndex(1);
    expect(input1th).toHaveValue('weapon');

    const input8th = await findInputByIndex(8);
    expect(input8th).toHaveValue('');

    fireEvent.change(input8th, {
      target: { value: 'lecture' }
    });

    await user.type(input8th, '{enter}');

    expect(window.document.activeElement.id).toBe('mnemonic-word-9');

    const input9th = await findInputByIndex(9);
    expect(input9th).toHaveValue('');

    const input16th = await findInputByIndex(16);
    expect(input16th).toHaveValue('');
  });
});
