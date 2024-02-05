import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { SuggestionBaseType } from './auto-suggest-box-types';

interface Props<SuggestionType extends SuggestionBaseType> {
  onChange?: (value: string) => void;
  initialValue?: string;
  suggestions?: SuggestionType[];
}

interface Context<SuggestionType extends SuggestionBaseType> {
  value: string;
  pickedSuggestion?: SuggestionType;
  isSuggesting: boolean;
  isCloseButton: boolean;
  filteredSuggestions: SuggestionType[];
  onSuggestionClick: (value: string) => void;
  onInputChange: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  onButtonClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
}

export const useAutoSuggestBox = <SuggestionType extends SuggestionBaseType>({
  onChange,
  initialValue = '',
  suggestions = [],
}: Readonly<Props<SuggestionType>>): Context<SuggestionType> => {
  const [value, setValue] = useState(initialValue);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const filteredSuggestions = suggestions.filter(item =>
    item.value.toLowerCase().includes(value.toLowerCase()),
  );
  const pickedSuggestion = suggestions.find(
    suggestion => suggestion.value === value,
  );

  const isCloseButton = isSuggesting || Boolean(value);

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  return useMemo(
    () => ({
      value,
      isSuggesting: filteredSuggestions.length > 0 && isSuggesting,
      isCloseButton,
      filteredSuggestions,
      pickedSuggestion,
      onSuggestionClick: (value): void => {
        setIsSuggesting(false);
        setValue(value);
      },
      onInputChange: (event): void => {
        setValue(event.target.value);
        setIsSuggesting(true);
      },
      onButtonClick: (event): void => {
        event.preventDefault();
        if (isCloseButton) {
          setValue('');
        }
        setIsSuggesting(!isCloseButton);
      },
    }),
    [value, setValue, isSuggesting, setIsSuggesting],
  );
};
