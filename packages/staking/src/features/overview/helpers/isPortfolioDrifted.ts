/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import sum from 'lodash/sum';
import type { CurrentPortfolioStakePool } from '../../store';

const PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD = 15;

const getPortfolioTotalPercentageDrift = (portfolio: CurrentPortfolioStakePool[]): number => {
  const totalValue = Wallet.BigIntMath.sum(portfolio.map(({ value }) => value));
  const totalWeight = sum(portfolio.map(({ targetWeight }) => targetWeight));

  return sum(
    portfolio.map(({ value, targetWeight }) => {
      const targetPercentage = (targetWeight / totalWeight) * 100;
      const currentPercentage = new BigNumber(value.toString()).div(totalValue.toString()).times(100).toNumber();
      return Math.abs(targetPercentage - currentPercentage);
    })
  );
};

export const isPortfolioDrifted = (currentPortfolio: CurrentPortfolioStakePool[]) => {
  const drift = getPortfolioTotalPercentageDrift(currentPortfolio);
  return drift >= PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD;
};
