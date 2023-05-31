import { createContext, useContext } from 'react';
import { Wallet } from '@lace/cardano';
// eslint-disable-next-line unicorn/no-null
export const DappContext = createContext<Wallet.DappInfo[]>(null);

export const useDappContext: () => Wallet.DappInfo[] = () => {
  const dappContext = useContext(DappContext);
  if (dappContext === null) throw new Error('DappContext is not defined.');
  return dappContext;
};
