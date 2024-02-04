import React from 'react';
import type { Meta } from '@storybook/react';

import { AddCoSigners } from './AddCoSigners';
import { Flex } from '@lace/ui';

const meta: Meta<typeof AddCoSigners> = {
  title: 'Shared Wallets/AddCoSigners',
  component: AddCoSigners,
  parameters: {
    layout: 'centered'
  }
};

export default meta;

export const Overview = (): JSX.Element => (
  <Flex alignItems="center" justifyContent="center" w="$480" h="$420">
    <AddCoSigners
      translations={{
        title: 'Add your Co-signers',
        subtitle: 'Add up to 20 wallet addresses to your shared wallet',
        inputLabel: "Recipient's address or $handle",
        addButton: 'Add Co-signer',
        backButton: 'Back',
        nextButton: 'Next'
      }}
      onBack={() => void 0}
      onNext={() => void 0}
    />
  </Flex>
);
