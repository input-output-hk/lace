import React from 'react';
import { HardwareWalletProvider } from './context';
import { ErrorDialog } from './ErrorDialog';
import { StartOverDialog } from './StartOverDialog';
import { Connect } from './steps/Connect';
import { Setup } from './steps/Setup';
import { Create } from './steps/Create';
import { WalletConnectStep } from './types';

export const HardwareWallet = (): JSX.Element => (
  <HardwareWalletProvider>
    {({ errorDialogCode, onErrorDialogRetry, isStartOverDialogVisible, onStartOverDialogAction, step }) => (
      <>
        {!!errorDialogCode && <ErrorDialog onRetry={onErrorDialogRetry} errorCode={errorDialogCode} />}
        <StartOverDialog
          visible={isStartOverDialogVisible}
          onStartOver={() => onStartOverDialogAction(true)}
          onClose={() => onStartOverDialogAction(false)}
        />
        {step === WalletConnectStep.Connect && <Connect />}
        {step === WalletConnectStep.Setup && <Setup />}
        {step === WalletConnectStep.Create && <Create />}
      </>
    )}
  </HardwareWalletProvider>
);
