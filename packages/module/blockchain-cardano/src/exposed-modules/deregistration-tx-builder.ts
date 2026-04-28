import { makeBuildDeregistrationTx } from '../tx-executor-implementation';

import type { MakeBuildDeregistrationTx } from '@lace-contract/cardano-context';

const createDeregistrationTxBuilder = (): MakeBuildDeregistrationTx =>
  makeBuildDeregistrationTx as MakeBuildDeregistrationTx;

export default createDeregistrationTxBuilder;
