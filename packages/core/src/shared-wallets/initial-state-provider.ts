import { createContext, useContext } from 'react';

export const makeInitialStateProvider = <InitialState>() => {
  const initialStateContext = createContext<InitialState | null>(null);

  const InitialStateProvider = initialStateContext.Provider;

  const useInitialState = <S extends InitialState>(defaultInitialState: S) => {
    const providedState = useContext(initialStateContext);
    return providedState !== null ? providedState : defaultInitialState;
  };

  return {
    InitialStateProvider,
    useInitialState,
  };
};
