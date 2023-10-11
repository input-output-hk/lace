import { config } from '@src/config';
import { Wallet } from '@lace/cardano';

export const getBaseUrlForChain = (chainName: Wallet.ChainName): string => {
  const { CARDANO_SERVICES_URLS, AVAILABLE_CHAINS } = config();
  let url = '';
  switch (chainName) {
    case 'Mainnet':
      url = CARDANO_SERVICES_URLS.Mainnet;
      break;
    case 'Preprod':
      url = CARDANO_SERVICES_URLS.Preprod;
      break;
    case 'Preview':
      url = CARDANO_SERVICES_URLS.Preview;
      break;
    case 'Sanchonet':
      url = CARDANO_SERVICES_URLS.Sanchonet;
      break;
    default:
      throw new Error('Incorrect chain supplied');
  }
  if (!AVAILABLE_CHAINS.includes(chainName)) throw new Error('Chain not supported');
  return url;
};
