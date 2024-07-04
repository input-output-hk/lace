import BigNumber from 'bignumber.js';
import { CoinId } from '../types';

const LOVELACE_VALUE = 1_000_000;
const DEFAULT_DECIMALS = 2;

export const lovelacesToAdaString = (
  lovelaces: string,
  decimalValues: number = DEFAULT_DECIMALS,
  roudingMode: BigNumber.RoundingMode = BigNumber.ROUND_HALF_UP
): string => new BigNumber(lovelaces).dividedBy(LOVELACE_VALUE).toFixed(decimalValues, roudingMode);

export const adaToLovelacesString = (ada: string): string => new BigNumber(ada).multipliedBy(LOVELACE_VALUE).toString();

export const convertAdaToFiat = (
  fields: { ada: string; fiat: number },
  decimalValues: number = DEFAULT_DECIMALS
): string => new BigNumber(fields.ada).multipliedBy(fields.fiat).toFixed(decimalValues);

export const convertLovelaceToFiat = (
  fields: { lovelaces: string; fiat: number },
  decimalValues: number = DEFAULT_DECIMALS
): string => convertAdaToFiat({ ada: lovelacesToAdaString(fields.lovelaces), fiat: fields.fiat }, decimalValues);

export const getFormattedAmount = ({ amount, cardanoCoin }: { amount: string; cardanoCoin: CoinId }): string => {
  const adaStringAmount = lovelacesToAdaString(amount);
  return `${adaStringAmount} ${cardanoCoin.symbol}`;
};
