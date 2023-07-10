import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { ILocalStorage } from '@src/types/local-storage';
import { config } from '@src/config';

export const appSettingsLocalStorageKey = 'appSettings';

export interface AppSettingsProviderProps {
  children: React.ReactNode;
  initialState?: ILocalStorage['appSettings'];
}

const useAppSettings = (
  initialState?: ILocalStorage['appSettings']
): [ILocalStorage['appSettings'], React.Dispatch<React.SetStateAction<ILocalStorage['appSettings']>>] => {
  const [settings, { updateLocalStorage }] = useLocalStorage(
    appSettingsLocalStorageKey,
    initialState || { chainName: config().CHAIN }
  );

  return [settings, updateLocalStorage];
};

// eslint-disable-next-line unicorn/no-null
const AppSettingContext = createContext<ReturnType<typeof useAppSettings | null>>(null);

export const useAppSettingsContext = (): ReturnType<typeof useAppSettings> => {
  const settingsContext = useContext(AppSettingContext);
  if (settingsContext === null) throw new Error('AppSettingContext not defined');
  return settingsContext;
};

export const AppSettingsProvider = ({ children, initialState }: AppSettingsProviderProps): React.ReactElement => (
  <AppSettingContext.Provider value={useAppSettings(initialState)}>{children}</AppSettingContext.Provider>
);
