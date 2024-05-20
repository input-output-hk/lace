import React from 'react';
import type { Meta } from '@storybook/react';

import { AddCoSigners } from './AddCoSigners';
import { ValidateAddress } from './type';

const meta: Meta<typeof AddCoSigners> = {
  title: 'Shared Wallets/AddCoSigners',
  component: AddCoSigners,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

const validateAddress: ValidateAddress = async (address) => {
  if (!address) {
    return { isValid: false };
  }

  return {
    isValid: address.startsWith('addr_test1')
  };
};

export const Overview = (): JSX.Element => (
  <AddCoSigners
    validateAddress={validateAddress}
    translations={{
      title: 'Add wallet co-signers',
      subtitle: 'Add up to 2 shared wallet co-signers wallet by entering their individual wallet addresses or handles.',
      inputLabel: "Co-signer's address or $handle",
      inputError: 'Invalid address',
      addButton: 'Add Co-signer',
      removeButton: 'Remove',
      backButton: 'Back',
      nextButton: 'Next',
      warningMessage: 'Ensure entered addresses are correct. Incorrect addresses may prevent shared wallet operation.'
    }}
    onBack={() => void 0}
    onNext={() => void 0}
  />
);
