import { makeBuildDelegationTx } from '../tx-executor-implementation';

import type { MakeBuildDelegationTx } from '@lace-contract/cardano-context';

const createDelegationTxBuilder = (): MakeBuildDelegationTx =>
  makeBuildDelegationTx as MakeBuildDelegationTx;

export default createDelegationTxBuilder;
