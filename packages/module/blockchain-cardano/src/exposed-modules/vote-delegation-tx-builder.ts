import { makeBuildVoteDelegationTx } from '../tx-executor-implementation';

import type { MakeBuildVoteDelegationTx } from '@lace-contract/cardano-context';

const createVoteDelegationTxBuilder = (): MakeBuildVoteDelegationTx =>
  makeBuildVoteDelegationTx as MakeBuildVoteDelegationTx;

export default createVoteDelegationTxBuilder;
