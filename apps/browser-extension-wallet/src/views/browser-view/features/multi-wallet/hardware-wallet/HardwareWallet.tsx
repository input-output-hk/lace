import { walletRoutePaths } from '@routes';
import { StartOverDialog } from '@views/browser/features/wallet-setup/components/StartOverDialog';
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { HardwareWalletProvider } from './context';
import { ErrorDialog } from './ErrorDialog';
import { Connect } from './steps/Connect';
import { Setup } from './steps/Setup';
import { Create } from './steps/Create';
import { Providers } from './types';

const {
  newWallet: { hardware }
} = walletRoutePaths;

interface Props {
  providers: Providers;
}

export const HardwareWallet = ({ providers }: Props): JSX.Element => (
  <HardwareWalletProvider providers={providers}>
    {({ errorDialogCode, onErrorDialogRetry, isStartOverDialogVisible, onStartOverDialogAction }) => (
      <>
        {!!errorDialogCode && <ErrorDialog visible onRetry={onErrorDialogRetry} errorCode={errorDialogCode} />}
        <StartOverDialog
          visible={isStartOverDialogVisible}
          onStartOver={() => onStartOverDialogAction(true)}
          onClose={() => onStartOverDialogAction(false)}
        />
        <Switch>
          <Route path={hardware.connect} component={Connect} />
          <Route path={hardware.setup} component={Setup} />
          <Route path={hardware.create} component={Create} />
          <Redirect from={hardware.root} to={hardware.connect} />
        </Switch>
      </>
    )}
  </HardwareWalletProvider>
);
