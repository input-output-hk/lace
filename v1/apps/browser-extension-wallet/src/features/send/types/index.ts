export enum CoinTabs {
  SIMPLE = 'simple',
  BUNDLE = 'bundle'
}

export type FormValidationKeys = 'addressInput' | 'coinsInput';
export type FormValidationState = Record<FormValidationKeys, boolean>;
export type SetFormValidationState = (key: FormValidationKeys, valid: boolean) => void;

export interface IAssetInfo {
  symbol: string;
  id: string;
  balance: string;
}

export interface DisplayedCoinDetail {
  amount: string;
  coinId: string;
}

export interface CommonProps {
  setFormValidationState: SetFormValidationState;
}
