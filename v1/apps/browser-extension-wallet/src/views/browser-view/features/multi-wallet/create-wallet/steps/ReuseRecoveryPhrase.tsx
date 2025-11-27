import React, { ReactElement } from 'react';
import { WalletSetupReuseMnemonicStep } from '@lace/core';
import { useCreateWallet } from '../context';

export const ReuseRecoveryPhrase = (): ReactElement => {
  const { back, next, setWalletToReuse, nonSelectedBlockchainWallets } = useCreateWallet();

  return (
    <WalletSetupReuseMnemonicStep
      wallets={nonSelectedBlockchainWallets}
      onBack={back}
      onNext={next}
      setWalletToReuse={setWalletToReuse}
    />
  );
};
