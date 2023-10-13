import '@testing-library/jest-dom';
import * as config from '@src/config';

import { getBaseUrlForChain } from '../chain';
import { Wallet } from '@lace/cardano';

describe('Testing getBaseUrlForChain function', () => {
  const OLD_ENV = process.env;
  const CARDANO_SERVICES_URLS = {
    Mainnet: 'Mainnet',
    Preprod: 'Preprod',
    Preview: 'Preview',
    Sanchonet: 'Sanchonet'
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });
  test('should return proper url for chainName or throw', async () => {
    process.env.USE_DEV_ENDPOINTS = 'true';
    const AVAILABLE_CHAINS = ['Mainnet', 'Preprod', 'Preview', 'Sanchonet'] as unknown as Wallet.ChainName[];
    jest.spyOn(config, 'config').mockReturnValue({ CARDANO_SERVICES_URLS, AVAILABLE_CHAINS } as config.Config);

    expect(getBaseUrlForChain('Mainnet')).toBe(CARDANO_SERVICES_URLS.Mainnet);
    expect(getBaseUrlForChain('Preprod')).toBe(CARDANO_SERVICES_URLS.Preprod);
    expect(getBaseUrlForChain('Preview')).toBe(CARDANO_SERVICES_URLS.Preview);
    expect(getBaseUrlForChain('Sanchonet')).toBe(CARDANO_SERVICES_URLS.Sanchonet);
  });

  test('should throw in case chain is not suported', async () => {
    process.env.USE_DEV_ENDPOINTS = 'true';
    const AVAILABLE_CHAINS = [] as unknown as Wallet.ChainName[];
    jest.spyOn(config, 'config').mockReturnValueOnce({ CARDANO_SERVICES_URLS, AVAILABLE_CHAINS } as config.Config);

    expect(() => getBaseUrlForChain('Mainnet')).toThrow(new Error('Chain not supported'));
  });
});
