import { useCallback } from 'react';

import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';

import { ERROR } from '../config/config';

import type { CreateWalletParams } from '../types/wallet';
import type {
  AddAccountProps,
  AnyWallet,
  UpdateAccountMetadataProps,
  WalletManagerActivateProps,
  WalletManagerApi,
} from '@cardano-sdk/web-extension';
import type { Observable } from 'rxjs';

interface ChangePasswordProps {
  chainId: Wallet.Cardano.ChainId;
  createWallet: (
    args: Readonly<CreateWalletParams>,
  ) => Promise<Wallet.CardanoWallet>;
  getMnemonic: (passphrase: Uint8Array) => Promise<string[]>;
  activeWalletId$: Readonly<WalletManagerApi['activeWalletId$']>;
  wallets$: Observable<
    AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[]
  >;
  addAccount: (
    props: Readonly<AddAccountProps<Wallet.AccountMetadata>>,
  ) => Promise<AddAccountProps<Wallet.AccountMetadata>>;
  activateWallet: (
    props: Readonly<WalletManagerActivateProps>,
    force?: boolean,
  ) => Promise<void>;
  deleteWallet: (
    isForgotPasswordFlow?: boolean,
  ) => Promise<WalletManagerActivateProps | undefined>;
  updateAccountMetadata: (
    props: Readonly<UpdateAccountMetadataProps<Wallet.AccountMetadata>>,
  ) => Promise<UpdateAccountMetadataProps<Wallet.AccountMetadata>>;
}

export const useChangePassword = ({
  chainId,
  addAccount,
  activateWallet,
  createWallet,
  getMnemonic,
  deleteWallet,
  updateAccountMetadata,
  wallets$,
  activeWalletId$,
}: Readonly<ChangePasswordProps>) => {
  const activeWallet = useObservable(activeWalletId$);
  const wallets = useObservable(wallets$);
  const { walletId, accountIndex } = activeWallet ?? {};
  const wallet = wallets?.find(elm => elm.walletId === walletId);

  return useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        if (!wallet?.metadata?.name) {
          return;
        }
        const mnemonic = await getMnemonic(Buffer.from(currentPassword));
        await deleteWallet(false);
        const newWallet = await createWallet({
          mnemonic,
          name: wallet.metadata.name,
          password: newPassword,
        });
        const { walletId } = newWallet.source.wallet;

        if (!('accounts' in wallet)) {
          return;
        }

        for await (const account of wallet.accounts) {
          const { accountIndex, metadata, extendedAccountPublicKey } = account;
          await (accountIndex === 0
            ? updateAccountMetadata({
                accountIndex,
                walletId,
                metadata,
              })
            : addAccount({
                accountIndex,
                metadata,
                walletId,
                extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex(
                  extendedAccountPublicKey,
                ),
              }));
        }
        await activateWallet({ chainId, walletId, accountIndex });
      } catch {
        throw ERROR.wrongPassword;
      }
    },
    [
      chainId,
      accountIndex,
      getMnemonic,
      createWallet,
      deleteWallet,
      updateAccountMetadata,
      addAccount,
      activateWallet,
      wallet?.metadata?.name,
    ],
  );
};
