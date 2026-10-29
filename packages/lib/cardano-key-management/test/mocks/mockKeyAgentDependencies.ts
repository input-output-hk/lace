import { SodiumBip32Ed25519 } from '@lace-lib/cardano-crypto';
import { dummyLogger } from 'ts-log';

import type { KeyAgentDependencies } from '../../src/';
import type { Mocked } from 'vitest';

export const mockKeyAgentDependencies = async (): Promise<
  Mocked<KeyAgentDependencies>
> => ({
  bip32Ed25519: await SodiumBip32Ed25519.create(),
  logger: dummyLogger,
});
