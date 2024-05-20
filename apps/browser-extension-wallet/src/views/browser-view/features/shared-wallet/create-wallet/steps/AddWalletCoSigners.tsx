/* eslint-disable no-console */
import React, { ReactElement } from 'react';
import { AddCoSigners } from '@lace/core';

export const AddWalletCoSigners = (): ReactElement => (
  <AddCoSigners
    onBack={() => console.log('back')}
    onNext={() => console.log('next')}
    validateAddress={() => Promise.resolve({ isValid: true })}
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
  />
);
