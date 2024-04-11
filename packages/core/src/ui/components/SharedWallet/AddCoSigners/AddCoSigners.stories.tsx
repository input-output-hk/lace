import React from 'react';
import type { Meta } from '@storybook/react';

import { AddCoSigners } from './AddCoSigners';
import { Flex } from '@lace/ui';
import { ValidateAddress } from './type';
import { Wallet } from '@lace/cardano';

const meta: Meta<typeof AddCoSigners> = {
  title: 'Shared Wallets/AddCoSigners',
  component: AddCoSigners,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

const addressBook = [
  {
    name: 'Alice',
    address:
      'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
  },
  {
    name: 'Bob',
    address:
      'addr_test1qp9xn9gwdjkj0w300vc8xgctegvgty2ks4n875zdzjkkzy3qz69wq6z9tpmuj9tutsc7f0s4kx6mvh3mwupmjdjx2fjqf0q2j2'
  },
  {
    name: 'Charlie',
    address: '$lace',
    handleResolution: {
      cardanoAddress:
        'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g'
    } as Wallet.HandleResolution
  }
];

const handleResolution =
  'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g' as Wallet.Cardano.PaymentAddress;
let timeout: number;

const validateAddress: ValidateAddress = async (address) => {
  if (!address) {
    return { isValid: false };
  }
  if (address.startsWith('$')) {
    return new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      const twoSeconds = 2000;
      timeout = window.setTimeout(() => {
        clearTimeout(timeout);
        const factor = 0.5;
        resolve(Math.random() < factor ? { isValid: true, handleResolution } : { isValid: false });
      }, twoSeconds);
    });
  }
  return {
    isValid: address.startsWith('addr_test1')
  };
};

export const Overview = (): JSX.Element => (
  <Flex alignItems="center" justifyContent="center" w="$480" h="$480">
    <AddCoSigners
      validateAddress={validateAddress}
      translations={{
        title: 'Add your Co-signers',
        subtitle: 'Add up to 20 wallet addresses to your shared wallet',
        inputLabel: "Recipient's address or $handle",
        inputError: 'Invalid address',
        addButton: 'Add Co-signer',
        removeButton: 'Remove',
        backButton: 'Back',
        nextButton: 'Next'
      }}
      onBack={() => void 0}
      onNext={() => void 0}
      addressBook={addressBook}
    />
  </Flex>
);
