import { Wallet } from '@lace/cardano';
import { getFormattedFiatAmount } from './common-tx-transformer';
import type { TransformedTx } from './types';
import dayjs from 'dayjs';
import { formatDate, formatTime } from '@src/utils/format-date';
import BigNumber from 'bignumber.js';
import type { CurrencyInfo } from '@src/types';
import type { Reward } from '@cardano-sdk/core';

interface RewardHistoryTransformerInput {
  rewards: Reward[]; // TODO this supposes rewards grouped by epoch which is a bit fragile
  fiatCurrency: CurrencyInfo;
  fiatPrice: number;
  date: Date;
  cardanoCoin: Wallet.CoinId;
}

export const rewardHistoryTransformer = ({
  rewards,
  fiatCurrency,
  fiatPrice,
  date,
  cardanoCoin
}: RewardHistoryTransformerInput): TransformedTx => {
  const formattedTimestamp = formatTime({
    date,
    type: 'local'
  });
  const formattedDate = dayjs().isSame(date, 'day')
    ? 'Today'
    : formatDate({ date, format: 'DD MMMM YYYY', type: 'local' });

  const totalRewardsAmount = Wallet.BigIntMath.sum(rewards.map(({ rewards: _rewards }) => _rewards));

  return {
    type: 'rewards',
    direction: 'Incoming',
    amount: Wallet.util.getFormattedAmount({ amount: totalRewardsAmount.toString(), cardanoCoin }),
    fiatAmount: getFormattedFiatAmount({
      amount: new BigNumber(totalRewardsAmount.toString()),
      fiatCurrency,
      fiatPrice
    }),
    status: Wallet.TransactionStatus.SPENDABLE,
    assets: [],
    date,
    formattedTimestamp,
    formattedDate
  };
};
