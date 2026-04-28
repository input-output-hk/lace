import {
  getDesignationTargetType,
  getDustTokenTickerByNetwork,
  toUnshieldedTokenType,
  NIGHT_TOKEN_ID,
  formatDustTime,
} from '@lace-contract/midnight-context';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useMemo } from 'react';

import { useLaceSelector } from './lace-context';

import type {
  DesignationTargetType,
  MidnightCoinDetail,
  MidnightSpecificTokenMetadata,
  MidnightAccountId,
} from '@lace-contract/midnight-context';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';

const DUST_TOKEN_DECIMALS = 15;

export type DustTankStatus = 'decaying' | 'empty' | 'filled' | 'refilling';

export type MidnightDustData = {
  current: string;
  max: string;
  ticker: string;
  status: DustTankStatus;
  timeRemaining?: string;
  designationTargetType: DesignationTargetType;
};

export type AccountDustDataMap = Record<AccountId, MidnightDustData>;

const getDustTankStatus = (value: bigint, maxValue: bigint): DustTankStatus => {
  if (value === 0n && maxValue === 0n) {
    return 'empty';
  } else if (value < maxValue) {
    return 'refilling';
  } else if (value === maxValue) {
    return 'filled';
  } else {
    return 'decaying';
  }
};

type TimeRemainingParams = {
  currentValue: bigint;
  maxCap: bigint;
  maxCapReachedAt: number | undefined;
  rate: bigint;
};

const calculateTimeRemainingSeconds = ({
  currentValue,
  maxCap,
  maxCapReachedAt,
  rate,
}: TimeRemainingParams): number => {
  if (rate === 0n || currentValue === maxCap) return 0;
  if (maxCapReachedAt === undefined) return 0;

  const now = Date.now();
  return Math.max(0, Math.floor((maxCapReachedAt - now) / 1000));
};

export const useMidnightDustData = (
  accounts: AnyAccount[],
): AccountDustDataMap => {
  const networkId = useLaceSelector('midnightContext.selectNetworkId');
  const networkType = useLaceSelector('network.selectNetworkType');
  const nightTokenId = toUnshieldedTokenType(NIGHT_TOKEN_ID, networkId);
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );

  const midnightAccounts = useMemo(
    () => accounts.filter(account => account.blockchainName === 'Midnight'),
    [accounts],
  ) as (AnyAccount & { accountId: MidnightAccountId })[];

  const midnightAccountIds = useMemo(
    () => midnightAccounts.map(a => a.accountId),
    [midnightAccounts],
  );

  const dustGenerationDetails = useLaceSelector(
    'midnightContext.selectDustGenerationDetails',
    midnightAccountIds,
  );

  return useMemo<AccountDustDataMap>(() => {
    if (!networkId || midnightAccounts.length === 0 || !dustGenerationDetails) {
      return {};
    }

    const map: AccountDustDataMap = {};
    for (const { accountId } of midnightAccounts) {
      const dustGenerationDetailsOfAccount = dustGenerationDetails[accountId];

      if (!dustGenerationDetailsOfAccount) continue;

      const { currentValue, maxCap, maxCapReachedAt, rate } =
        dustGenerationDetailsOfAccount;

      const status = getDustTankStatus(currentValue, maxCap);

      const timeRemainingSeconds = calculateTimeRemainingSeconds({
        currentValue,
        maxCap,
        maxCapReachedAt,
        rate,
      });

      const dustTicker = getDustTokenTickerByNetwork(networkType);

      const accountNightToken = (
        tokensGroupedByAccount[accountId]?.fungible ?? []
      ).find(token => token.tokenId === nightTokenId) as
        | Token<MidnightSpecificTokenMetadata>
        | undefined;

      const nightCoins: MidnightCoinDetail[] =
        accountNightToken?.metadata?.blockchainSpecific?.coins || [];

      const designationTargetType = getDesignationTargetType(
        nightCoins,
        currentValue,
      );

      map[accountId] = {
        current: formatAmountToLocale(
          currentValue.toString(),
          DUST_TOKEN_DECIMALS,
          0,
        ),
        max: formatAmountToLocale(maxCap.toString(), DUST_TOKEN_DECIMALS, 0),
        ticker: dustTicker,
        status,
        timeRemaining: formatDustTime(timeRemainingSeconds),
        designationTargetType,
      };
    }

    return map;
  }, [
    networkId,
    networkType,
    nightTokenId,
    midnightAccounts,
    dustGenerationDetails,
    tokensGroupedByAccount,
  ]);
};
