/* eslint-disable unicorn/no-useless-undefined */
import type React from 'react';
import { useEffect, useState } from 'react';

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
  closeSuggestions: () => void;
  onPickedSuggestionClick: () => void;
  onSuggestionClick: (value: string) => void;
  onInputChange: (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => void;
  onButtonClick: () => void;
}

export const useAutoSuggestBox = <SuggestionType extends SuggestionBaseType>({
  onChange,
  initialValue = '',
  suggestions = [],
}: Readonly<Props<SuggestionType>>): Context<SuggestionType> => {
  const [value, setValue] = useState(initialValue);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [pickedSuggestion, setPickedSuggestion] = useState<
    SuggestionType | undefined
  >();
  const filteredSuggestions = suggestions.filter(item =>
    Object.values(item).some((itemValue: string) =>
      itemValue.toLowerCase().includes(value.toLowerCase()),
    ),
  );

  const isCloseButton = isSuggesting || Boolean(value);

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  return {
    value,
    isSuggesting: filteredSuggestions.length > 0 && isSuggesting,
    isCloseButton,
    filteredSuggestions,
    pickedSuggestion,
    onSuggestionClick: (value): void => {
      setIsSuggesting(false);
      setValue(value);
      const pickedSuggestion = suggestions.find(
        suggestion => suggestion.value === value,
      );

      if (pickedSuggestion) {
        setPickedSuggestion(pickedSuggestion);
      }
    },
    onPickedSuggestionClick: (): void => {
      setPickedSuggestion(undefined);
    },
    onInputChange: (event): void => {
      setValue(event.target.value);
      setIsSuggesting(true);
    },
    onButtonClick: (): void => {
      if (isCloseButton) {
        setValue('');
        setPickedSuggestion(undefined);
      }
      setIsSuggesting(!isCloseButton);
    },
    closeSuggestions: (): void => {
      setIsSuggesting(false);
    },
  };
};
