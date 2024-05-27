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
  <AddCoSigners validateAddress={validateAddress} onBack={() => void 0} onNext={() => void 0} />
);
