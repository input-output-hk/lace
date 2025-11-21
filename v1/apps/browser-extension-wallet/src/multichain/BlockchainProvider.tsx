/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/explicit-module-boundary-types */
import React, { createContext, useContext, useState } from 'react';

export enum Blockchain {
  Cardano = 'cardano',
  Bitcoin = 'bitcoin'
}

type BlockchainContextType = {
  blockchain: Blockchain;
  setBlockchain: (value: Blockchain) => void;
};

const BlockchainContext = createContext<BlockchainContextType>({
  blockchain: Blockchain.Cardano,
  setBlockchain: () => {}
});

export const BlockchainProvider: React.FC = ({ children }) => {
  const [blockchain, setBlockchain] = useState(Blockchain.Cardano);

  return <BlockchainContext.Provider value={{ blockchain, setBlockchain }}>{children}</BlockchainContext.Provider>;
};

export const useCurrentBlockchain = () => useContext(BlockchainContext);
