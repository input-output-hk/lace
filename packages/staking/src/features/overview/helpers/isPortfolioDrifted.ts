/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import BigNumber from 'bignumber.js';
import sum from 'lodash/sum';
import type { CurrentPortfolioStakePool } from '../../store';
import { PERCENTAGE_SCALE_MAX } from '../../store';
import { TMP_HOTFIX_PORTFOLIO_STORE_NOT_PERSISTED } from '../../store/delegationPortfolioStore/constants';

const PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD = 15;

const getPortfolioTotalPercentageDrift = (portfolio: CurrentPortfolioStakePool[]): number => {
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

// TODO: move this file to store. It gets imported also outside the overview feature so the store seems better place.
export const isPortfolioDrifted = (currentPortfolio: CurrentPortfolioStakePool[]) => {
  if (TMP_HOTFIX_PORTFOLIO_STORE_NOT_PERSISTED) return false;

  const drift = getPortfolioTotalPercentageDrift(currentPortfolio);
  return drift >= PORTFOLIO_DRIFT_PERCENTAGE_THRESHOLD;
};
