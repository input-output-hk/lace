import { NetworkId } from '@midnight-ntwrk/zswap';

export const DEFAULT_NETWORK_ADDRESSES = {
  [NetworkId.Undeployed]: {
    nodeAddress: 'http://localhost:9944',
    proverAddress: 'http://localhost:6300',
    pubSubAddress: 'http://localhost:8088/api/v1/graphql'
  },
  [NetworkId.DevNet]: {
    nodeAddress: 'https://rpc.devnet.midnight.network',
    proverAddress: 'http://localhost:6300',
    pubSubAddress: 'https://indexer.devnet.midnight.network/api/v1/graphql'
  }
};

export const MIDNIGHT_NETWORK_ID = process.env.MIDNIGHT_NETWORK === 'local' ? NetworkId.Undeployed : NetworkId.DevNet;
