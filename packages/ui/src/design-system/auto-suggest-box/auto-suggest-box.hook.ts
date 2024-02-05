import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { SuggestionBase } from './auto-suggest-box-types';

interface Props<SuggestionType extends SuggestionBase> {
  onChange?: (value: string) => void;
  initialValue?: string;
  suggestions?: SuggestionType[];
}

interface Context<SuggestionType extends SuggestionBase> {
  value: string;
  isSuggesting: boolean;
  isCloseButton: boolean;
  filteredSuggestions: SuggestionType[];
  onSuggestionClick: (value: string) => void;
  onInputChange: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  onButtonClick: (event: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
}

export const useAutoSuggestBox = <SuggestionType extends SuggestionBase>({
  onChange,
  initialValue = '',
  suggestions = [],
}: Readonly<Props<SuggestionType>>): Context<SuggestionType> => {
  const [value, setValue] = useState(initialValue);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const filteredSuggestions = suggestions.filter(item =>
    item.value.toLowerCase().includes(value.toLowerCase()),
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
