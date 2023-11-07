/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import sum from 'lodash/sum';
import type { CurrentPortfolioStakePool } from './stateMachine/types';
import { PERCENTAGE_SCALE_MAX } from './constants';
import { isPortfolioSavedOnChain } from './isPortfolioSavedOnChain';
import { sumPercentagesSanitized } from './stateMachine';

const PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD = 15;

const getPortfolioTotalPercentageDrift = (
  portfolio: (CurrentPortfolioStakePool & { savedIntegerPercentage: number })[]
): number => {
  const totalValue = Wallet.BigIntMath.sum(portfolio.map(({ value }) => value));
  return sum(
    portfolio.map(({ value, savedIntegerPercentage }) => {
      const currentPercentage = new BigNumber(value.toString())
        .div(totalValue.toString())
        .times(PERCENTAGE_SCALE_MAX)
        .toNumber();
      return Math.abs(savedIntegerPercentage - currentPercentage);
    })
  );
};

export const isPortfolioDrifted = (currentPortfolio: CurrentPortfolioStakePool[]) => {
  const onChainPercentageSum = sumPercentagesSanitized({
    items: currentPortfolio,
    key: 'onChainPercentage',
  });
  if (onChainPercentageSum !== PERCENTAGE_SCALE_MAX) return true;
  if (!isPortfolioSavedOnChain(currentPortfolio)) return false;
  const drift = getPortfolioTotalPercentageDrift(currentPortfolio);
  return drift >= PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD;
};
