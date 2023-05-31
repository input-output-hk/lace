import React, { createContext, useContext } from 'react';
import { axiosClient } from '../../lib/axios';

interface AxiosClientProviderProps {
  children: React.ReactNode;
  client?: typeof axiosClient;
}

type AxiosContextInstance = [typeof axiosClient];

// eslint-disable-next-line unicorn/no-null
const AxiosClientContext = createContext<typeof axiosClient | null>(null);

export const useAxiosClientContext = (): AxiosContextInstance => {
  const axiosInstance = useContext(AxiosClientContext);
  if (axiosInstance === null) throw new Error('AxiosClientContext not defined');
  return [axiosInstance];
};

export const AxiosClientProvider = ({
  children,
  client = axiosClient
}: AxiosClientProviderProps): React.ReactElement => (
  <AxiosClientContext.Provider value={client}>{children}</AxiosClientContext.Provider>
);
