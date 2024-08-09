import { useCallback, useEffect } from 'react';

import { useObservable } from '@lace/common';

import type {
  AnyWallet,
  UpdateAccountMetadataProps,
  WalletId,
  WalletManagerApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { Observable } from 'rxjs';

interface Props {
  wallets$: Observable<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]
  >;
  activeWalletId$: Readonly<WalletManagerApi['activeWalletId$']>;
  updateAccountMetadata: (
    props: Readonly<UpdateAccountMetadataProps<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata>>;
}

const getActiveAccountMetadata = ({
  walletId,
  accountIndex,
  wallets,
}: Readonly<{
  walletId?: WalletId;
  accountIndex?: number;
  wallets: Readonly<AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]>;
}>): Wallet.AccountMetadata => {
  if (!wallets) {
    return { name: '' };
  }
  const wallet = wallets.find(elm => elm.walletId === walletId);
  const accounts = wallet && 'accounts' in wallet ? wallet.accounts : [];
  return (
    accounts.find(acc => acc.accountIndex === accountIndex)?.metadata ?? {
      name: '',
    }
  );
};

export const useInitializeNamiMetadata = ({
  wallets$,
  activeWalletId$,
  updateAccountMetadata,
}: Readonly<Props>): void => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};

  useEffect(() => {
    if (walletId === undefined || accountIndex === undefined) {
      return;
    }
    const metadata = getActiveAccountMetadata({
      walletId,
      accountIndex,
      wallets,
    });

    if (metadata && !metadata.namiMode) {
      void updateAccountMetadata({
        walletId,
        accountIndex,
        metadata: {
          ...metadata,
          namiMode: {
            avatar: Math.random().toString(),
          },
        },
      });
    }
  }, [walletId, accountIndex, wallets]);
};

export const useUpdateAccount = ({
  wallets$,
  activeWalletId$,
  updateAccountMetadata,
}: Readonly<Props>): {
  accountName: string;
  accountAvatar?: string;
  updateAccountMetadata: (
    data: Readonly<Partial<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata> | undefined>;
} => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};
  const metadata = getActiveAccountMetadata({
    walletId,
    accountIndex,
    wallets,
  });

  return {
    accountName: metadata.name,
    accountAvatar: metadata.namiMode?.avatar,
    updateAccountMetadata: useCallback(
      async (data: Readonly<Partial<Wallet.AccountMetadata>>) => {
        if (walletId === undefined || accountIndex === undefined) {
          return;
        }

        return updateAccountMetadata({
          walletId,
          accountIndex,
          metadata: {
            ...metadata,
            ...data,
          },
        });
      },
      [walletId, accountIndex, metadata],
    ),
  };
};
