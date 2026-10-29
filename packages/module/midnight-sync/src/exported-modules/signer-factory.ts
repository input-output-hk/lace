import { midnightWalletsForRuntime } from '@lace-contract/midnight-context';

import { MidnightInMemorySignerFactory } from '../signing/midnight-in-memory-signer-factory';

import type { MidnightSignerFactory } from '@lace-contract/midnight-context';
import type { ModuleInitProps } from '@lace-contract/module';

const initSignerFactory = ({
  runtime,
}: Pick<ModuleInitProps, 'runtime'>): MidnightSignerFactory =>
  new MidnightInMemorySignerFactory(midnightWalletsForRuntime(runtime));

export default initSignerFactory;
