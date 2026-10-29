import { Cardano } from '@lace-lib/cardano-core';

import { InMemoryKeyAgent, util } from '../../src';

import { mockKeyAgentDependencies } from './mockKeyAgentDependencies';

import type { AsyncKeyAgent, KeyAgentDependencies } from '../../src';

export const getPassphrase = vi.fn(async () => Buffer.from('password'));

export const testKeyAgent = async (dependencies?: KeyAgentDependencies) => {
  if (!dependencies) {
    dependencies = await mockKeyAgentDependencies();
  }

  return InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      chainId: Cardano.ChainIds.Preview,
      getPassphrase,
      mnemonicWords: util.generateMnemonicWords(),
    },
    dependencies,
  );
};

export const testAsyncKeyAgent = async (
  dependencies?: KeyAgentDependencies,
  keyAgentReady?: Promise<InMemoryKeyAgent>,
  shutdownSpy?: () => AsyncKeyAgent,
) => {
  if (!dependencies) {
    dependencies = await mockKeyAgentDependencies();
  }

  if (!keyAgentReady) {
    keyAgentReady = testKeyAgent(dependencies);
  }

  return util.createAsyncKeyAgent(await keyAgentReady, shutdownSpy);
};
