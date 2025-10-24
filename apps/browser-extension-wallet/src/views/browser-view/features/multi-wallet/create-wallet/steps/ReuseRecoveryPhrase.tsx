import React, { ReactElement, useMemo } from 'react';
import { WalletSetupReuseMnemonicStep } from '@lace/core';
import { useCreateWallet } from '../context';
import { useObservable } from '@lace/common';
import { walletRepository } from '@lib/wallet-api-ui';
import { AnyWallet } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';

// TODO: LW-13686: Remove this when selected blockchain is implemented
const selectedBlockchain = 'cardano';

type AnyWalletWithBlockchainName = AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata> & {
  blockchainName: string;
};

const hasBlockchainName = (
  wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
): wallet is AnyWalletWithBlockchainName => typeof (wallet as Record<string, unknown>)?.blockchainName === 'string';

const getWalletBlockchain = (wallet: AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) =>
  hasBlockchainName(wallet) ? wallet.blockchainName : 'Cardano';

export const ReuseRecoveryPhrase = (): ReactElement => {
  const { back, next, setWalletToReuse } = useCreateWallet();
  const wallets = useObservable(walletRepository.wallets$);

  const nonSelectedBlockchainWallets = useMemo(
    () => wallets?.filter((wallet) => getWalletBlockchain(wallet).toLowerCase() !== selectedBlockchain.toLowerCase()),
    [wallets]
  );

  return (
    <WalletSetupReuseMnemonicStep
      wallets={nonSelectedBlockchainWallets}
      onBack={back}
      onNext={next}
      setWalletToReuse={setWalletToReuse}
    />
  );
};
