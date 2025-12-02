import { BANXA_LACE_URL } from './config';
import { Blockchain } from '@src/multichain/BlockchainProvider';

const coinTypeByBlockchain: Record<Blockchain, string> = {
  [Blockchain.Cardano]: 'ADA',
  [Blockchain.Bitcoin]: 'BTC'
};

interface BanxaUrlConfig {
  blockchain: Blockchain;
  walletAddress: string;
}

export const getBanxaUrl = (config: BanxaUrlConfig): string => {
  const url = new URL(BANXA_LACE_URL);
  const coinType = coinTypeByBlockchain[config.blockchain];

  url.searchParams.append('coinType', coinType);
  url.searchParams.append('walletAddress', config.walletAddress);

  return url.toString();
};
