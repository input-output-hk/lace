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
import flatten from 'lodash/flatten';
import groupBy from 'lodash/groupBy';
import merge from 'lodash/merge';

import type { WalletManagerAddAccountProps } from '../features/outside-handles-provider/types';
import type {
  WalletId,
  HardwareWallet,
  Bip32WalletAccount,
} from '@cardano-sdk/web-extension';
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
  removeWallet: (props: WalletId) => Promise<WalletId>;
  updateAccountMetadata: (
    props: Readonly<UpdateAccountMetadataProps<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata>>;
}

export interface Account {
  index: number;
  walletId: string;
  name: string;
  avatar?: string;
  balance?: string;
  recentSendToAddress?: string;
  hw?: boolean;
}

export interface UseAccount {
  allAccounts: Account[];
  activeAccount: Account;
  nonActiveAccounts: Account[];
  nextIndex: number;
  addAccount: (
    props: Readonly<{ index: number; name: string; passphrase: Uint8Array }>,
  ) => Promise<void>;
  activateAccount: (
    props: Readonly<{
      accountIndex: number;
      walletId?: WalletId;
      force?: boolean;
    }>,
  ) => Promise<void>;
  removeAccount: (
    props: Readonly<{
      accountIndex: number;
      walletId?: WalletId;
    }>,
  ) => Promise<void>;
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

const getNextAccountIndex = (
  accounts: readonly Account[],
  activeAccount: Readonly<Account>,
) => {
  const walletAccounts = accounts.filter(
    a => a.walletId === activeAccount.walletId,
  );

  for (const [index, account] of walletAccounts.entries()) {
    if (account.index !== index) {
      return index;
    }
  }

  return walletAccounts.length;
};

const getAcountsMapper =
  (
    wallet: Readonly<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>>,
  ) =>
  ({
    accountIndex,
    metadata,
  }: Readonly<Bip32WalletAccount<Wallet.AccountMetadata>>) => ({
    index: accountIndex,
    walletId: wallet.walletId,
    name: metadata?.name || `${wallet.type} ${accountIndex}`,
    hw: wallet.type === WalletType.Ledger || wallet.type === WalletType.Trezor,
    ...metadata.namiMode,
  });

export const useAccount = ({
  chainId = Wallet.Cardano.ChainIds.Mainnet,
  wallets$,
  activeWalletId$,
  addAccount,
  activateAccount,
  removeAccount,
  removeWallet,
  updateAccountMetadata,
}: Readonly<AccountsProps>): UseAccount => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};

  const allAccountsSorted = useMemo(() => {
    const allWallets = wallets?.filter(
      (w): w is HardwareWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> =>
        w.type !== WalletType.Script,
    );
    const groupedWallets = groupBy(allWallets, ({ type }) => type);
    return flatten(
      Object.entries(groupedWallets)
        .sort(([type1], [type2]) => {
          if (type1 === WalletType.InMemory && type2 !== WalletType.InMemory)
            return -1;
          if (type2 === WalletType.InMemory && type1 !== WalletType.InMemory)
            return 1;
          return 0;
        })
        .map(([_type, wallets]) => {
          const wallet =
            wallets.find(w => w.walletId === walletId) ?? wallets[0];
          const accountsMapper = getAcountsMapper(wallet);
          return 'accounts' in wallet
            ? wallet.accounts
                // eslint-disable-next-line functional/prefer-tacit
                .map(account => accountsMapper(account))
                .sort((a, b) => a.index - b.index)
            : [];
        }),
    );
  }, [wallets, walletId, accountIndex]);

  const activeAccount = useMemo(
    () =>
      allAccountsSorted.find(
        ({ index, walletId }) =>
          accountIndex === index && walletId === activeWallet?.walletId,
      ) ??
      allAccountsSorted[0] ??
      {},
    [allAccountsSorted, accountIndex, activeWallet?.walletId],
  );

  return {
    allAccounts: allAccountsSorted,
    activeAccount,
    nextIndex: useMemo(
      () => getNextAccountIndex(allAccountsSorted, activeAccount),
      [allAccountsSorted, activeAccount],
    ),
    nonActiveAccounts: useMemo(
      () =>
        allAccountsSorted.filter(
          account =>
            account.walletId !== walletId || account.index !== accountIndex,
        ),
      [allAccountsSorted, accountIndex, walletId],
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
      async ({ accountIndex, walletId }) => {
        if (walletId === undefined) {
          return;
        }
        const isLastAccount = !allAccountsSorted.some(
          a => a.walletId === walletId && a.index !== accountIndex,
        );
        console.log(isLastAccount, { accountIndex, walletId });
        await (isLastAccount
          ? removeWallet(walletId)
          : removeAccount({ accountIndex, walletId }));
      },
      [removeAccount, walletId, allAccountsSorted],
    ),
    activateAccount: useCallback(
      async props => {
        if (walletId === undefined) {
          return;
        }
        await activateAccount(
          {
            chainId,
            accountIndex: props.accountIndex,
            walletId: props.walletId ?? walletId,
          },
          props.force ?? false,
        );
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
