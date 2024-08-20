import { useCallback, useEffect, useMemo } from 'react';

import { useObservable } from '@lace/common';
import merge from 'lodash/merge';

import type {
  AnyWallet,
  UpdateAccountMetadataProps,
  WalletId,
  WalletManagerApi,
} from '@cardano-sdk/web-extension';
import type { Wallet } from '@lace/cardano';
import type { Observable } from 'rxjs';

interface Props {
  addresses$: Observable<Wallet.WalletAddress[]>;
  wallets$: Observable<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]
  >;
  activeWalletId$: Readonly<WalletManagerApi['activeWalletId$']>;
  updateAccountMetadata: (
    props: Readonly<UpdateAccountMetadataProps<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata>>;
}

export interface UseAccount {
  activeAccount: {
    name: string;
    avatar?: string;
    recentSendToAddress?: string;
  };
  accounts: {
    name: string;
    avatar?: string;
    address?: string;
  }[];
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
  addresses$,
  wallets$,
  activeWalletId$,
  updateAccountMetadata,
}: Readonly<Props>): void => {
  const activeWallet = useObservable(activeWalletId$);
  const addresses = useObservable(addresses$);
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

    if (!metadata) {
      return;
    }

    const hasAvatar = Boolean(metadata.namiMode?.avatar);
    const hasAddress = Boolean(metadata.namiMode?.address);

    if (hasAvatar && hasAddress) {
      return;
    }

    const avatar = Math.random().toString();
    const address = addresses[0].address.toString();
    const updatedMetadata = merge(
      { ...metadata },
      {
        namiMode: {
          ...(hasAvatar ? {} : { avatar }),
          ...(hasAddress ? {} : { address }),
        },
      },
    );

    void updateAccountMetadata({
      walletId,
      accountIndex,
      metadata: updatedMetadata,
    });
  }, [walletId, accountIndex, wallets, addresses, updateAccountMetadata]);
};

export const useAccount = ({
  wallets$,
  activeWalletId$,
  updateAccountMetadata,
}: Readonly<
  Pick<Props, 'activeWalletId$' | 'updateAccountMetadata' | 'wallets$'>
>): UseAccount => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};
  const metadata = getActiveAccountMetadata({
    walletId,
    accountIndex,
    wallets,
  });

  return {
    activeAccount: useMemo(
      () => ({
        name: metadata.name,
        avatar: metadata.namiMode?.avatar,
        recentSendToAddress: metadata.namiMode?.recentSendToAddress,
      }),
      [
        metadata.name,
        metadata.namiMode?.avatar,
        metadata.namiMode?.recentSendToAddress,
      ],
    ),
    accounts: useMemo(() => {
      const wallet = wallets?.find(elm => elm.walletId === walletId);
      if (wallet && 'accounts' in wallet) {
        return wallet.accounts
          .filter(account => account.accountIndex !== accountIndex)
          .map(account => {
            return {
              name: account.metadata.name,
              avatar: account.metadata.namiMode?.avatar,
              address: account.metadata.namiMode?.address,
            };
          });
      }

      return [];
    }, [wallets, walletId, accountIndex]),
    updateAccountMetadata: useCallback(
      async data => {
        if (walletId === undefined || accountIndex === undefined) {
          return;
        }
        const updatedMetadata = merge({ ...metadata }, data);

        return updateAccountMetadata({
          walletId,
          accountIndex,
          metadata: updatedMetadata,
        });
      },
      [walletId, accountIndex, metadata],
    ),
  };
};
