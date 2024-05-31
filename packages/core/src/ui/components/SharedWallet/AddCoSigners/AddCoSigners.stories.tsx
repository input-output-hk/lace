import React from 'react';
import type { Meta } from '@storybook/react';

import { AddCoSigners } from './AddCoSigners';
import { ValidateAddress } from './type';
import { v1 as uuid } from 'uuid';

const meta: Meta<typeof AddCoSigners> = {
  title: 'Shared Wallets/AddCoSigners',
  component: AddCoSigners,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

const cosigners = [
  { address: '', isValid: false, id: uuid() },
  { address: '', isValid: false, id: uuid() }
];

const validateAddress: ValidateAddress = (address) => ({ isValid: address ? address.startsWith('addr_test1') : false });

export const Overview = (): JSX.Element => (
  <AddCoSigners validateAddress={validateAddress} onBack={() => void 0} onNext={() => void 0} coSigners={cosigners} />
);
