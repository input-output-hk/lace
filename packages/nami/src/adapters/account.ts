import { useCallback, useMemo } from 'react';

import {
  WalletType,
  type AnyWallet,
  type RemoveAccountProps,
  type UpdateAccountMetadataProps,
  type WalletManagerActivateProps,
  type WalletManagerApi,
} from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import merge from 'lodash/merge';

import type { WalletManagerAddAccountProps } from '../features/outside-handles-provider/types';
import type { WalletId } from '@cardano-sdk/web-extension';
import type { Observable } from 'rxjs';

interface AccountsProps {
  chainId?: Wallet.Cardano.ChainId;
  wallets$: Observable<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]
  >;
  activeWalletId$: Readonly<WalletManagerApi['activeWalletId$']>;
  addAccount: (props: Readonly<WalletManagerAddAccountProps>) => Promise<void>;
  activateAccount: (
    props: Readonly<WalletManagerActivateProps>,
    force: boolean,
  ) => Promise<void>;
  removeAccount: (
    props: Readonly<RemoveAccountProps>,
  ) => Promise<RemoveAccountProps>;
  updateAccountMetadata: (
    props: Readonly<UpdateAccountMetadataProps<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata>>;
}

interface Account {
  index: number;
  name: string;
  avatar?: string;
  balance?: string;
  recentSendToAddress?: string;
}

export interface UseAccount {
  allAccounts: Account[];
  activeAccount: Account;
  nonActiveAccounts: Account[];
  nextIndex: number;
  addAccount: (
    props: Readonly<{ index: number; name: string; passphrase: Uint8Array }>,
  ) => Promise<void>;
  activateAccount: (accountIndex: number, force?: boolean) => Promise<void>;
  removeAccount: (accountIndex: number) => Promise<void>;
  updateAccountMetadata: (
    data: Readonly<{
      name?: string;
      namiMode?: Partial<Wallet.AccountMetadata['namiMode']>;
    }>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata> | undefined>;
}

const getActiveAccountMetadata = ({
  walletId,
  accountIndex,
  wallets,
}: Readonly<{
  walletId: WalletId;
  accountIndex: number;
  wallets: Readonly<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]>;
}>): Wallet.AccountMetadata => {
  const wallet = wallets.find(elm => elm.walletId === walletId);
  const accounts = wallet && 'accounts' in wallet ? wallet.accounts : [];
  return (
    accounts.find(acc => acc.accountIndex === accountIndex)?.metadata ?? {
      name: '',
    }
  );
};

const getNextAccountIndex = (accounts: readonly Account[]) => {
  for (const [index, account] of accounts.entries()) {
    if (account.index !== index) {
      return index;
    }
  }

  return accounts.length;
};

export const useAccount = ({
  chainId = Wallet.Cardano.ChainIds.Mainnet,
  wallets$,
  activeWalletId$,
  addAccount,
  activateAccount,
  removeAccount,
  updateAccountMetadata,
}: Readonly<AccountsProps>): UseAccount => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};

  const allAccountsSorted = useMemo(() => {
    const wallet = wallets?.find(elm => elm.walletId === walletId);
    if (wallet && 'accounts' in wallet) {
      return wallet.accounts
        .map(account => ({
          index: account.accountIndex,
          name: account.metadata.name,
          ...account.metadata.namiMode,
        }))
        .sort((a, b) => a.index - b.index);
    }
    return [];
  }, [wallets, walletId, accountIndex]);

  const activeAccount = useMemo(
    () =>
      allAccountsSorted.find(({ index }) => accountIndex === index) ?? {
        index: 0,
        name: '',
      },
    [allAccountsSorted, accountIndex],
  );

  return {
    allAccounts: allAccountsSorted,
    activeAccount,
    // TODO: filter hw wallets
    nextIndex: useMemo(
      () => getNextAccountIndex(allAccountsSorted),
      [allAccountsSorted],
    ),
    nonActiveAccounts: useMemo(
      () =>
        allAccountsSorted
          .filter(account => account.index !== accountIndex)
          .sort((a, b) => a.index - b.index),
      [allAccountsSorted, accountIndex],
    ),
    addAccount: useCallback(
      async ({ index, name, passphrase }) => {
        const wallet = wallets?.find(elm => elm.walletId === walletId);
        if (wallet === undefined || wallet.type === WalletType.Script) {
          return;
        }
        await addAccount({
          accountIndex: index,
          wallet,
          metadata: { name },
          passphrase,
        });
      },
      [wallets, addAccount],
    ),
    removeAccount: useCallback(
      async (accountIndex: number) => {
        if (walletId === undefined) {
          return;
        }
        await removeAccount({ accountIndex, walletId });
      },
      [removeAccount, walletId],
    ),
    activateAccount: useCallback(
      async (accountIndex: number, force = false) => {
        if (walletId === undefined) {
          return;
        }
        await activateAccount({ chainId, accountIndex, walletId }, force);
      },
      [activateAccount, walletId, chainId],
    ),
    updateAccountMetadata: useCallback(
      async data => {
        if (walletId === undefined || accountIndex === undefined) {
          return;
        }

        const metadata = getActiveAccountMetadata({
          accountIndex,
          walletId,
          wallets,
        });
        const updatedMetadata = merge({ ...metadata }, data);

        return updateAccountMetadata({
          walletId,
          accountIndex,
          metadata: updatedMetadata,
        });
      },
      [wallets, walletId, accountIndex, activeAccount],
    ),
  };
};
