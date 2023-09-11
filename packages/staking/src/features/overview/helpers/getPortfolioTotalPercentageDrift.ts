/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import sum from 'lodash/sum';
import { CurrentPortfolioStakePool } from '../../store';

export const getPortfolioTotalPercentageDrift = (portfolio: CurrentPortfolioStakePool[]): number => {
  const totalValue = Wallet.BigIntMath.sum(portfolio.map(({ value }) => value));
  const totalWeight = sum(portfolio.map(({ weight }) => weight));

  return sum(
    portfolio.map(({ value, weight }) => {
      const targetPercentage = (weight / totalWeight) * 100;
      const currentPercentage = new BigNumber(value.toString()).div(totalValue.toString()).times(100).toNumber();
      return Math.abs(targetPercentage - currentPercentage);
    })
  );
};
