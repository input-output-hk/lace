import type { CurrentPortfolioStakePool } from '../../store/types';
import { getPortfolioTotalPercentageDrift } from './getPortfolioTotalPercentageDrift';

const PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD = 15;

export const isPortfolioDrifted = (currentPortfolio: CurrentPortfolioStakePool[]) => {
  const drift = getPortfolioTotalPercentageDrift(currentPortfolio);
  return drift >= PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD;
};
