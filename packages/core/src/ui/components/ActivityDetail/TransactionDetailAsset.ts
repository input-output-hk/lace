import { TransactionActivityType } from '@ui/components/ActivityDetail/types';

export interface TransactionDetailAsset {
  icon?: string;
  title: string;
  subtitle?: string;
}

export interface CoinItemProps {
  amount: string;
  fiatBalance?: string;
  handleClick: () => unknown;
  id: number | string;
  logo?: string;
  name: string;
  symbol?: string;
}

export interface TxOutputInput {
  addr: string;
  amount: string;
  assetList?: CoinItemProps[];
}

export interface TxSummary extends Omit<TxOutputInput, 'addr'> {
  addr: string[];
  type: TransactionActivityType;
}

interface TxMetadata {
  key: string;
  value: string | unknown[];
}

export interface TransactionMetadataProps {
  /**
   * List of key/value pairs with the transaction metadata
   */
  metadata: TxMetadata[];
}
