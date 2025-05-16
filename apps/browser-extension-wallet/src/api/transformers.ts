import {
  WalletBalance,
  NetworkInformation,
  CoinOverview,
  CardanoStakePool,
  CardanoTxOut,
  CurrencyInfo,
  TransactionActivityDetail
} from '../types';
import { Wallet } from '@lace/cardano';
import { addEllipsis, getNumberWithUnit } from '@lace/common';
import { TxOutputInput, CoinItemProps } from '@lace/core';
import { formatDate, formatTime } from '../utils/format-date';
import { TokenInfo } from '@src/utils/get-assets-information';
import { getTokenAmountInFiat, parseFiat } from '@src/utils/assets-transformers';
import { PriceResult } from '@hooks';

export const walletBalanceTransformer = (lovelaceBalance: string, fiat?: number): WalletBalance => {
  const adaValue = Wallet.util.lovelacesToAdaString(lovelaceBalance);

  return {
    coinBalance: adaValue,
    fiatBalance: fiat ? Wallet.util.convertAdaToFiat({ ada: adaValue, fiat }) : undefined
  };
};

const coercionMult = 1000;
const coercionDiv = 10;

export const networkInfoTransformer = (
  {
    currentEpoch,
    stake,
    lovelaceSupply
  }: {
    currentEpoch: Wallet.EpochInfo;
    lovelaceSupply: Wallet.SupplySummary;
    stake: Wallet.StakeSummary;
  },
  poolStats: Wallet.StakePoolStats
): NetworkInformation => ({
  totalStaked: getNumberWithUnit(Wallet.util.lovelacesToAdaString(stake.active.toString())),
  totalStakedPercentage:
    Number.parseInt(((stake.active * BigInt(coercionMult)) / lovelaceSupply.circulating).toString()) / coercionDiv,
  nextEpochIn: currentEpoch.lastSlot.date,
  currentEpochIn: currentEpoch.firstSlot.date,
  currentEpoch: currentEpoch.epochNo.toString(),
  stakePoolsAmount: poolStats.qty.active.toString()
});

const tokenSymbolPrefixLength = 8;
const tokenSymbolSuffixLength = 6;

export const tokenTransformer = (
  assetInfo: Wallet.Asset.AssetInfo,
  assetBalance: [Wallet.Cardano.AssetId, bigint],
  prices: PriceResult,
  fiatCurrency: CurrencyInfo
): CoinOverview => {
  const { nftMetadata, tokenMetadata, fingerprint } = assetInfo;
  const { name } = { ...tokenMetadata, ...nftMetadata };
  const [assetId, bigintBalance] = assetBalance;
  const amount = Wallet.util.calculateAssetBalance(bigintBalance, assetInfo);
  const tokenPriceInAda = prices?.cardano.getTokenPrice(assetId)?.priceInAda;
  const fiatBalance =
    tokenMetadata !== undefined &&
    tokenPriceInAda &&
    prices?.cardano.price &&
    `${parseFiat(Number(getTokenAmountInFiat(amount, tokenPriceInAda, prices?.cardano.price)))} ${fiatCurrency?.code}`;

  return {
    id: assetId.toString(),
    amount,
    name: name ?? fingerprint.toString(),
    symbol:
      name ??
      tokenMetadata?.ticker ??
      addEllipsis(fingerprint.toString(), tokenSymbolPrefixLength, tokenSymbolSuffixLength),
    logo: tokenMetadata?.icon ?? '',
    fiatBalance
  };
};

export const transformTokenMap = (
  tokenMap: Wallet.Cardano.TokenMap,
  assetsInfo: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>,
  coinPrices: PriceResult,
  fiatCurrency: CurrencyInfo
): Pick<CoinItemProps, 'symbol' | 'amount' | 'fiatBalance' | 'id' | 'logo' | 'name'>[] => {
  if (!tokenMap) return [];
  const transformed: CoinOverview[] = [];
  for (const [id, amount] of tokenMap) {
    const token = assetsInfo.get(id);
    // Do not display token if we don't have the info yet
    if (token) {
      transformed.push(tokenTransformer(token, [id, amount], coinPrices, fiatCurrency));
    }
  }
  return transformed;
};

/**
 * Returns slot leader ticker, name or id
 */
const slotLeaderTransformer = (slotLeader: CardanoStakePool): string =>
  slotLeader?.metadata?.ticker ?? slotLeader?.metadata?.name ?? slotLeader.id.toString();

const isStakePool = (props: CardanoStakePool | Wallet.Cardano.SlotLeader): props is CardanoStakePool =>
  props && (props as CardanoStakePool).id !== undefined;

/**
 * format block information
 */
export const blockTransformer = (block: Wallet.BlockInfo): TransactionActivityDetail['blocks'] => ({
  blockId: block.header.hash.toString(),
  epoch: block.epoch.toString(),
  block: block.header.blockNo.toString(),
  slot: block.header.slot.toString(),
  confirmations: block.confirmations.toString(),
  size: block.size.toString(),
  transactions: block.txCount.toString(),
  utcDate: formatDate({ date: block.date, format: 'MM/DD/YYYY', type: 'utc' }),
  utcTime: `${formatTime({ date: block.date, type: 'utc' })} UTC`,
  nextBlock: block.nextBlock ? String(block.header.blockNo.valueOf() + 1) : undefined,
  prevBlock: block.previousBlock ? String(block.header.blockNo.valueOf() - 1) : undefined,
  createdBy: isStakePool(block.slotLeader) ? slotLeaderTransformer(block.slotLeader) : block.slotLeader?.toString()
});

export const inputOutputTransformer = (
  txInOut: Wallet.TxInput | CardanoTxOut,
  assets: TokenInfo,
  coinPrices: PriceResult,
  fiatCurrency: CurrencyInfo
): TxOutputInput => ({
  amount: txInOut.value ? Wallet.util.lovelacesToAdaString(txInOut.value?.coins.toString()) : '0',
  assetList: transformTokenMap(txInOut.value?.assets, assets, coinPrices, fiatCurrency) as TxOutputInput['assetList'],
  addr: txInOut.address?.toString() ?? '-'
});
