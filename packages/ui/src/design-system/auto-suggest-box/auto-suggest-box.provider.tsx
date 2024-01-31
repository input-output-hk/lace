/* eslint-disable functional/no-throw-statements */
/* eslint-disable unicorn/no-null */
import type {
  Dispatch,
  PropsWithChildren,
  ReactElement,
  SetStateAction,
} from 'react';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface Item {
  label?: string;
  value: string;
}

interface Props {
  onChange?: (value: string) => void;
  initialValue?: string;
  items?: Item[];
}

interface AutoSuggestBoxContextType {
  isSuggesting: boolean;
  setIsSuggesting: Dispatch<SetStateAction<boolean>>;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  suggestions: Item[];
}

export const AutoSuggestBoxContext =
  createContext<AutoSuggestBoxContextType | null>(null);

export const useAutoSuggestBoxContext = (): AutoSuggestBoxContextType => {
  const autoSuggestBoxContext = useContext(AutoSuggestBoxContext);
  if (autoSuggestBoxContext === null) throw new Error('context not defined');
  return autoSuggestBoxContext;
};

export const AutoSuggestBoxProvider = ({
  children,
  onChange,
  initialValue = '',
  items = [],
}: Readonly<PropsWithChildren<Props>>): ReactElement => {
  const [value, setValue] = useState(initialValue);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suggestions = items.filter(item => item.value.includes(value));

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  const context = useMemo(
    () => ({
      value,
      setValue,
      isSuggesting: suggestions.length > 0 && isSuggesting,
      setIsSuggesting,
      suggestions,
    }),
    [value, setValue, isSuggesting, setIsSuggesting],
  );

  return (
    <AutoSuggestBoxContext.Provider value={context}>
      {children}
    </AutoSuggestBoxContext.Provider>
  );
};
