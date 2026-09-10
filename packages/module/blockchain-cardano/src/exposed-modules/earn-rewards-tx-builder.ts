import { makeBuildEarnRewardsTx } from '../tx-executor-implementation';

import type { MakeBuildEarnRewardsTx } from '@lace-contract/cardano-context';

const createEarnRewardsTxBuilder = (): MakeBuildEarnRewardsTx =>
  makeBuildEarnRewardsTx as MakeBuildEarnRewardsTx;

export default createEarnRewardsTxBuilder;
