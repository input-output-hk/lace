import React, { createContext, useCallback, useContext, useState } from 'react';
import { Location } from 'history';

interface Props {
  children: React.ReactNode;
}

interface State {
  page?: Location<unknown>;
  setBackgroundPage: (page?: Location) => void;
}

// eslint-disable-next-line unicorn/no-null
const BackgroundPageContext = createContext<State | null>(null);

export const useBackgroundPage = (): State => {
  const context = useContext(BackgroundPageContext);
  if (context === null) throw new Error('BackgroundPageContext not defined');
  return context;
};

export const BackgroundPageProvider = ({ children }: Props): React.ReactElement => {
  const [page, setPageState] = useState<Location<unknown>>();

  const setBackgroundPage = useCallback(
    (nextPage: Location<unknown>) => {
      setPageState(nextPage);
    },
    [setPageState]
  );

  return (
    <BackgroundPageContext.Provider
      value={{
        page,
        setBackgroundPage
      }}
    >
      {children}
    </BackgroundPageContext.Provider>
  );
};
