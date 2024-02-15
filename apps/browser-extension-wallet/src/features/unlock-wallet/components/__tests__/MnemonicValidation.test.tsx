/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockValidateWalletMnemonic = jest.fn();
/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import { MnemonicValidation } from '../MnemonicValidation';
import '@testing-library/jest-dom';
import { AppSettingsProvider } from '../../../../providers';
import { StoreProvider } from '../../../../stores';
import { mockKeyAgentDataTestnet } from '@src/utils/mocks/test-helpers';
// import { I18nextProvider } from 'react-i18next';
// import i18n from 'i18next';
import { APP_MODE_BROWSER } from '@src/utils/constants';

jest.mock('react-router-dom', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useHistory: jest.fn().mockReturnValue({ goBack: jest.fn() })
}));

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      validateWalletMnemonic: mockValidateWalletMnemonic
    }
  };
});

describe('Testing MnemonicValidation component', () => {
  const onSuccessMock = jest.fn();

  const WrappedMnemonicValidation = () => (
    <AppSettingsProvider>
      <StoreProvider appMode={APP_MODE_BROWSER}>
        <MnemonicValidation
          onValidationSuccess={onSuccessMock}
          publicKey={mockKeyAgentDataTestnet.extendedAccountPublicKey}
        />
      </StoreProvider>
    </AppSettingsProvider>
  );
  // TODO: fix test once the RecoveryPhrase component is fully implemented
  test.skip('should render mnemonic inputs with label and confirm button disabled', async () => {
    const { findByTestId, findByText } = render(<WrappedMnemonicValidation />);

    const container = await findByTestId('recovery-phrase');
    const inputs = await within(container).findAllByTestId(/mnemonic-input/i);
    const button = await findByText('Confirm');

    expect(inputs).toHaveLength(48);
    expect(button).toHaveAttribute('disabled', 'true');
  });

  // FIXME: mock Wallet.validateWalletMnemonic response (TODO in the RecoveryPhase component should be resolved first)
  test.skip(
    'should enable confirm button if the mnemonic and inputs are the same' +
      ' and call onValidationSuccess when clicked',
    async () => {
      mockValidateWalletMnemonic.mockReturnValue(true);

      const { findByTestId, findByText } = render(<WrappedMnemonicValidation />);

      const container = await findByTestId('recovery-phrase');
      const inputs = await within(container).findAllByTestId(/mnemonic-input-\d/i);
      const button = await findByText('Confirm');

      // eslint-disable-next-line unicorn/no-array-for-each
      inputs.forEach((input) => fireEvent.change(input, 'a'));
      expect(button).toHaveAttribute('disabled', 'false');

      fireEvent.click(button);
      expect(onSuccessMock).toHaveBeenCalled();
    }
  );
});
