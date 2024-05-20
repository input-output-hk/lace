import React from 'react';
import { TextBox } from '@lace/ui';
import { ValidateAddress } from './type';
import { useCoSignerInput } from './hooks';

interface Props {
  onChange: (address: string, isValid: boolean) => void;
  validateAddress: ValidateAddress;
  translations: {
    label: string;
    error: string;
  };
}

export const AddCoSignerInput = ({ translations, validateAddress, onChange }: Props): JSX.Element => {
  const { errorMessage, onInputChange } = useCoSignerInput({
    validateAddress,
    onChange,
    errorString: translations.error
  });

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await onInputChange(event.target.value);
  };

  return <TextBox label={translations.label} errorMessage={errorMessage} onChange={handleInputChange} w="$fill" />;
};
