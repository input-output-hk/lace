import { isCardanoAccount } from '../util';

import type { CardanoCustodyAccountProps } from '../types';
import type {
  AnyAccount,
  CardanoCustodyWallet,
  CardanoCustodyWalletAccount,
} from '@lace-contract/wallet-repo';

/** A Cardano custody account, with its Cardano account data. */
export type CardanoCustodyAccount =
  CardanoCustodyWalletAccount<CardanoCustodyAccountProps>;
/** A wallet holding Cardano custody accounts. */
export type CardanoCustodyWalletEntity =
  CardanoCustodyWallet<CardanoCustodyAccountProps>;

/** Whether `account` is a Cardano custody account. */
export const isCardanoCustodyAccount = (
  account: AnyAccount,
): account is CardanoCustodyAccount =>
  isCardanoAccount(account) && account.accountType === 'CardanoCustody';
