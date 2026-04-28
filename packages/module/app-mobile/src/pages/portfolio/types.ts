import type { FlatListProps } from 'react-native';

export enum SelectedAssetView {
  Assets = 0,
  Nfts = 1,
  Activities = 2,
}

export interface ActionHandlers {
  onBuyPress?: () => void;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onAccountsPress?: () => void;
}

export enum AccountViewType {
  Account = 'account',
  Portfolio = 'portfolio',
}

export type AccountView =
  | { type: AccountViewType.Account; accountIndex: number }
  | { type: AccountViewType.Portfolio };

export type AssetView = { type: SelectedAssetView };

export type ListHeaderComponentProperty<T> =
  FlatListProps<T>['ListHeaderComponent'];
