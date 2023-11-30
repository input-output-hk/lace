import { WalletSetupSelectAccountsStep } from '@lace/core';
import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { StartOverDialog } from '../../../wallet-setup/components/StartOverDialog';
import { ErrorHandling } from './ErrorHandling';
import { useHardwareWallet } from '../context';
import { walletRoutePaths } from '@routes';

const TOTAL_ACCOUNTS = 50;

export const SelectAccount = (): JSX.Element => {
  const history = useHistory();
  const [isStartOverDialogVisible, setIsStartOverDialogVisible] = useState(false);
  const { setAccount } = useHardwareWallet();

  const handleonSubmit = (account: number) => {
    setAccount(account);
    history.push(walletRoutePaths.newWallet.hardware.name);
  };

  return (
    <>
      <ErrorHandling />
      <WalletSetupSelectAccountsStep
        accounts={TOTAL_ACCOUNTS}
        onBack={() => setIsStartOverDialogVisible(true)}
        onSubmit={handleonSubmit}
      />
      <StartOverDialog
        visible={isStartOverDialogVisible}
        onStartOver={() => history.goBack()}
        onClose={() => setIsStartOverDialogVisible(false)}
      />
    </>
  );
};
