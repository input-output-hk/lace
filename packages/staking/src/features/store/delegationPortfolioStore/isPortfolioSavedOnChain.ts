import type { CurrentPortfolioStakePool } from './stateMachine/types';

export const isPortfolioSavedOnChain = (
  currentPortfolio: CurrentPortfolioStakePool[]
): currentPortfolio is (CurrentPortfolioStakePool & { savedIntegerPercentage: number })[] =>
  currentPortfolio.every(({ savedIntegerPercentage }) => savedIntegerPercentage);
