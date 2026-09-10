import { Cardano, Milliseconds } from '@cardano-sdk/core';

import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';

export type NetworkName = 'preprod' | 'preview';

type NetworkDefinition = {
  chain: Cardano.ChainId;
  // Blockfrost host only. getBlockfrostClient appends `/api/<apiVersion>`.
  host: string;
  // A live, active pool on the network. Any active pool satisfies delegation.
  poolId: string;
  // Env var holding the Blockfrost project id (the only secret).
  projectIdEnv: string;
};

const PLACEHOLDER = 'PLACEHOLDER';

const NETWORKS: Record<NetworkName, NetworkDefinition> = {
  preprod: {
    chain: Cardano.ChainIds.Preprod,
    host: 'https://cardano-preprod.blockfrost.io',
    poolId: 'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
    projectIdEnv: 'BLOCKFROST_PROJECT_ID_PREPROD',
  },
  preview: {
    chain: Cardano.ChainIds.Preview,
    host: 'https://cardano-preview.blockfrost.io',
    // APEX, a live, active preview pool (any active pool satisfies delegation).
    poolId: 'pool1a7h89sr6ymj9g2a9tm6e6dddghl64tp39pj78f6cah5ewgd4px0',
    projectIdEnv: 'BLOCKFROST_PROJECT_ID_PREVIEW',
  },
};

export type Network = {
  name: NetworkName;
  chain: Cardano.ChainId;
  pool: Cardano.PoolId;
  config: BlockfrostConfig;
};

/** Resolves a network's chain, pool, and Blockfrost config, reading its secret from env. */
export const selectNetwork = (name: NetworkName): Network => {
  const definition = NETWORKS[name];
  if (!definition) {
    const known = Object.keys(NETWORKS).join(', ');
    throw new Error(`unknown network "${name}", expected one of ${known}`);
  }
  const projectId = process.env[definition.projectIdEnv];
  if (!projectId) {
    throw new Error(`${definition.projectIdEnv} is required to run on ${name}`);
  }
  if (definition.poolId.startsWith(PLACEHOLDER)) {
    throw new Error(
      `${name} pool id is a placeholder, set a live ${name} pool`,
    );
  }
  return {
    name,
    chain: definition.chain,
    pool: Cardano.PoolId(definition.poolId),
    config: {
      // apiVersion has no default in getBlockfrostClient (unlike the http-client
      // factory), so it must be set or the URL becomes /api/undefined.
      clientConfig: { baseUrl: definition.host, projectId, apiVersion: 'v0' },
      // Blockfrost free tier: ~10 req/s burst. Conservative reservoir.
      rateLimiterConfig: {
        size: 10,
        increaseAmount: 10,
        increaseInterval: Milliseconds(1000),
      },
    },
  };
};
