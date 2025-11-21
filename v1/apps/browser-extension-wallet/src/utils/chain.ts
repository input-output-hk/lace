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

export const getBaseKoraLabsUrlForChain = (chainName: Wallet.ChainName): string => {
  switch (chainName) {
    case 'Mainnet':
      return 'https://api.handle.me/';
    case 'Preprod':
      return 'https://preprod.api.handle.me/';
    case 'Preview':
      return 'https://preview.api.handle.me/';
  }

  throw new Error('Chain not supported by KoraLabs');
};

export const getMagicForChain = (chainName: Wallet.ChainName): Wallet.Cardano.NetworkMagics => {
  const { AVAILABLE_CHAINS } = config();
  let magic = 0;
  switch (chainName) {
    case 'Mainnet':
      magic = Wallet.Cardano.NetworkMagics.Mainnet;
      break;
    case 'Preprod':
      magic = Wallet.Cardano.NetworkMagics.Preprod;
      break;
    case 'Preview':
      magic = Wallet.Cardano.NetworkMagics.Preview;
      break;
    case 'Sanchonet':
      magic = Wallet.Cardano.NetworkMagics.Sanchonet;
      break;
    default:
      throw new Error('Incorrect chain supplied');
  }

  if (!AVAILABLE_CHAINS.includes(chainName)) throw new Error('Chain not supported');

  return magic;
};
