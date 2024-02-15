import React from 'react';
import type { SuggestionThreeItemType } from '@lace/ui';
import { AutoSuggestBox } from '@lace/ui';
import { ValidateAddress } from './type';
import { useCoSignerInput } from './hooks';

interface Props {
  onChange: (address: string, isValid: boolean) => void;
  validateAddress: ValidateAddress;
  translations: {
    label: string;
    error: string;
  };
  suggestions: SuggestionThreeItemType[];
}

export const AddCoSignerInput = ({ translations, suggestions, validateAddress, onChange }: Props): JSX.Element => {
  const { errorMessage, validationStatus, onInputChange } = useCoSignerInput({
    validateAddress,
    onChange,
    errorString: translations.error
  });

  return (
    <AutoSuggestBox
      label={translations.label}
      errorMessage={errorMessage}
      suggestions={suggestions}
      validationStatus={validationStatus}
      onChange={onInputChange}
    />
  );
};
