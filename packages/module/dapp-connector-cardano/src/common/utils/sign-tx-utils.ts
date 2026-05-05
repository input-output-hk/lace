import { ADA_DECIMALS } from '@lace-contract/cardano-context';
import { CardanoTokenPriceId } from '@lace-contract/token-pricing';
import { valueToLocale } from '@lace-lib/util-render';

import type { TransactionType } from './transaction-utils';
import type { TFunction } from '@lace-contract/i18n';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export const calculateAdaFiatValue = (
  lovelaceAmount: bigint,
  tokenPrices: Record<TokenPriceId, TokenPrice> | undefined,
  currencyTicker: string | undefined,
): string | undefined => {
  if (!tokenPrices || !currencyTicker) return undefined;

  const adaPriceId = CardanoTokenPriceId('ADA');
  const adaPrice = tokenPrices[adaPriceId];
  if (!adaPrice) return undefined;

  const adaBalance = Number(lovelaceAmount) / Math.pow(10, ADA_DECIMALS);
  const fiatValue = adaBalance * adaPrice.price;

  return `${valueToLocale(fiatValue, 2, 2)} ${currencyTicker}`;
};

export const getTransactionTypeLabel = (
  transactionType: TransactionType,
  t: TFunction,
): string => {
  switch (transactionType) {
    case 'Send':
      return t('dapp-connector.cardano.sign-tx.tx-type-send', {
        defaultValue: 'Send',
      });
    case 'Receive':
      return t('dapp-connector.cardano.sign-tx.tx-type-receive', {
        defaultValue: 'Receive',
      });
    case 'Self Transaction':
      return t('dapp-connector.cardano.sign-tx.tx-type-self', {
        defaultValue: 'Self Transaction',
      });
    default: {
      const _exhaustive: never = transactionType;
      return _exhaustive;
    }
  }
};
