import React, { useState } from 'react';
import { AutoSuggestBox } from '@lace/ui';
import { CoSigner, ValidateAddress } from './type';
import { useCoSignerInput } from './hooks';

interface Props {
  onChange: (coSigner: CoSigner) => void;
  validateAddress: ValidateAddress;
  translations: {
    label: string;
    error: string;
  };
  suggestions: AutoSuggestBox.Suggestion3ItemType[];
}

export const AddCoSignerInput = ({ translations, suggestions, validateAddress, onChange }: Props): JSX.Element => {
  const { errorMessage, validationStatus, onInputChange } = useCoSignerInput({
    validateAddress,
    onChange,
    errorString: translations.error
  });

  return (
    <AutoSuggestBox.Root
      label={translations.label}
      errorMessage={errorMessage}
      suggestions={suggestions}
      suggestionComponent={AutoSuggestBox.Suggestion3Item}
      pickedSuggestionComponent={AutoSuggestBox.PickedSuggestion3Item}
      validationStatus={validationStatus}
      onChange={onInputChange}
    />
  );
};
