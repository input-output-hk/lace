import React, { createContext, useContext } from 'react';
import { WalletDatabase } from '../../lib/storage';

interface DatabaseProviderProps {
  children: React.ReactNode;
  dbCustomInstance?: WalletDatabase;
}

type DatabaseContextInstance = [WalletDatabase];

// eslint-disable-next-line unicorn/no-null
const DatabaseContext = createContext<WalletDatabase | null>(null);

export const useDatabaseContext = (): DatabaseContextInstance => {
  const dbInstance = useContext(DatabaseContext);
  if (dbInstance === null) throw new Error('DatabaseContext not defined');
  return [dbInstance];
};

const database = new WalletDatabase();

export const DatabaseProvider = ({ children, dbCustomInstance }: DatabaseProviderProps): React.ReactElement => (
  <DatabaseContext.Provider value={dbCustomInstance || database}>{children}</DatabaseContext.Provider>
);
