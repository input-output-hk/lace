import { version } from '../../package.json';
import { Network } from '../types';
import { NetworkType } from '../types';

import { NODE } from './config';

// import secrets from 'secrets';

const networkToProjectId = {
  mainnet: 'preprodT2ItX4qKPEJOiJ7HH3q4zOFMZK4wQrtH',
  testnet: 'preprodT2ItX4qKPEJOiJ7HH3q4zOFMZK4wQrtH',
  preprod: 'preprodT2ItX4qKPEJOiJ7HH3q4zOFMZK4wQrtH',
  preview: 'preprodT2ItX4qKPEJOiJ7HH3q4zOFMZK4wQrtH',
};

interface PriceData {
  cardano: Record<string, number>;
}

interface keyType {
  project_id: string;
}

// eslint-disable-next-line import/no-default-export
export default {
  api: {
    ipfs: 'https://ipfs.blockfrost.dev/ipfs',
    base: (node = NODE.mainnet) => node,
    header: { ['secrets.NAMI_HEADER' || 'dummy']: version },
    key: (network: NetworkType = NetworkType.MAINNET): keyType => ({
      project_id: networkToProjectId[network],
    }),
    price: async (currency = 'usd'): Promise<number> => {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=${currency}`,
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data: PriceData = await response.json();

      return data.cardano[currency];
    },
  },
};
