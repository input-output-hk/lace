import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import { RecoveryPhrase, RecoveryPhraseProps } from '../RecoveryPhrase';
import '@testing-library/jest-dom';

describe('Testing RecoveryPhrase component', () => {
  const props = {
    handleBack: jest.fn(),
    recoveryPhrase: {
      validateMnemonic: jest.fn(),
      confirmMnemonic: jest.fn(),
      mnemonicLength: 4
    }
  } as RecoveryPhraseProps;

  // TODO: fix test once the RecoveryPhrase component is fully implemented

  test.skip('should render mnemonic inputs and label', async () => {
    const { findByTestId } = render(<RecoveryPhrase {...props} />);

    const container = await findByTestId('recovery-phrase');
    const inputs = await within(container).findAllByTestId(/mnemonic-input/i);

    // eslint-disable-next-line no-magic-numbers
    expect(inputs).toHaveLength(8);
  });

  test.skip('should call event when click on back button ', async () => {
    const { findByTestId } = render(<RecoveryPhrase {...props} />);

    const backBtn = await findByTestId('recovery-phrase-back-btn');
    fireEvent.click(backBtn);

    expect(props.handleBack).toHaveBeenCalled();
  });
});
