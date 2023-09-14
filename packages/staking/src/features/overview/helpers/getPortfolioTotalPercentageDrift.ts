/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import { CurrentPortfolioStakePool } from 'features/store';
import sum from 'lodash/sum';

export const getPortfolioTotalPercentageDrift = (portfolio: CurrentPortfolioStakePool[]): number => {
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
