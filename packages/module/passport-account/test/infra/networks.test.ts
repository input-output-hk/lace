import { describe, expect, it } from 'vitest';

import {
  midnightDevnetNetwork,
  validatePassportNetwork,
} from '../../src/infra/networks';

import type { PassportNetworkConfig } from '@lace-contract/passport';

const ARTEFACT_URL = 'https://artefacts.example/account';

const localNetwork: PassportNetworkConfig = {
  networkId: 'undeployed',
  indexerUrl: 'http://localhost:8088/api/v4/graphql',
  indexerWsUrl: 'ws://localhost:8088/api/v4/graphql/ws',
  nodeUrl: 'http://localhost:9944',
  artefactUrl: 'http://localhost:5173/zk/account',
};

describe('midnightDevnetNetwork', () => {
  it('names devnet with its public indexer and node and the given artefact bundle', () => {
    expect(midnightDevnetNetwork({ artefactUrl: ARTEFACT_URL })).toEqual({
      networkId: 'devnet',
      indexerUrl: 'https://indexer.devnet.midnight.network/api/v4/graphql',
      indexerWsUrl: 'wss://indexer.devnet.midnight.network/api/v4/graphql/ws',
      nodeUrl: 'https://rpc.devnet.midnight.network',
      artefactUrl: ARTEFACT_URL,
    });
  });

  it('builds a config the module accepts', () => {
    const network = midnightDevnetNetwork({ artefactUrl: ARTEFACT_URL });

    expect(validatePassportNetwork(network)).toBe(network);
  });
});

describe('validatePassportNetwork', () => {
  it('accepts a local network over plain http and ws', () => {
    expect(validatePassportNetwork(localNetwork)).toBe(localNetwork);
  });

  it.each(['', 'Devnet', 'dev_net', 'dev net', 'testnet-02'])(
    'refuses the network id %j, which no address prefix could carry',
    networkId => {
      expect(() =>
        validatePassportNetwork({ ...localNetwork, networkId }),
      ).toThrow(
        `The Passport network id "${networkId}" is not a Midnight network id`,
      );
    },
  );

  it('accepts a hyphenated network id', () => {
    const network = { ...localNetwork, networkId: 'testnet-2' };

    expect(validatePassportNetwork(network)).toBe(network);
  });

  it('refuses an endpoint that is not an absolute URL', () => {
    expect(() =>
      validatePassportNetwork({ ...localNetwork, nodeUrl: '/rpc' }),
    ).toThrow('The Passport network nodeUrl "/rpc" is not an absolute URL.');
  });

  it('refuses a host without a scheme, which parses as a scheme of its own', () => {
    expect(() =>
      validatePassportNetwork({ ...localNetwork, nodeUrl: 'localhost:9944' }),
    ).toThrow(
      'The Passport network nodeUrl "localhost:9944" must use http: or https:, not localhost:.',
    );
  });

  it.each([
    ['indexerUrl', 'ws://localhost:8088/api/v4/graphql', 'http: or https:'],
    ['nodeUrl', 'wss://rpc.devnet.midnight.network', 'http: or https:'],
    ['artefactUrl', 'file:///tmp/account', 'http: or https:'],
    ['indexerWsUrl', 'https://indexer.devnet.midnight.network', 'ws: or wss:'],
  ] as const)(
    'refuses a %s with a scheme the clients cannot open',
    (field, url, allowed) => {
      expect(() =>
        validatePassportNetwork({ ...localNetwork, [field]: url }),
      ).toThrow(`The Passport network ${field} "${url}" must use ${allowed}`);
    },
  );
});
