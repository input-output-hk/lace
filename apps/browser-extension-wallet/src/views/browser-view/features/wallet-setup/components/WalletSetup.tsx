import {
  useWalletSetupConfirmationDialog,
  WalletSetupConfirmationDialogProvider,
  WalletSetupFlow,
  WalletSetupFlowProvider
} from '@lace/core';
import React, { ReactNode } from 'react';
import { Route, Switch } from 'react-router-dom';
import { Home } from '@views/browser/features/multi-wallet/components';
import { SetupCreateWallet, SetupHardwareWallet, SetupRestoreWallet } from '@views/browser/features/multi-wallet';
import { BehaviorSubject } from 'rxjs';
import { WalletSetupLayout } from '@src/views/browser-view/components/Layout';
import { Portal } from './Portal';

const WalletSetupConfirmationDialogShouldShowDIalogStreamGetter = ({
  children
}: {
  children: (params: { shouldShowDialog$: BehaviorSubject<boolean> }) => ReactNode;
}) => {
  const { shouldShowDialog$ } = useWalletSetupConfirmationDialog();
  return <>{children({ shouldShowDialog$ })}</>;
};

const onboardingPaths = {
  root: '/setup',
  create: {
    root: '/setup/create',
    setup: '/setup/create/setup',
    keepSecure: '/setup/create/keep-secure',
    recoveryPhrase: '/setup/create/recovery-phrase',
    allDone: '/setup/create/all-done'
  },
  hardware: {
    root: '/setup/hardware',
    connect: '/setup/hardware/connect',
    select: '/setup/hardware/select',
    name: '/setup/hardware/name',
    allDone: '/setup/hardware/all-done'
  },
  restore: {
    root: '/setup/restore',
    setup: '/setup/restore/setup',
    keepSecure: '/setup/restore/keep-secure',
    selectRecoveryPhraseLength: '/setup/restore/select-recovery-phrase-length',
    enterRecoveryPhrase: '/setup/restore/enter-recovery-phrase',
    allDone: '/setup/restore/all-done'
  }
};

// eslint-disable-next-line react/no-multi-comp
export const WalletSetup = () => (
  <WalletSetupConfirmationDialogProvider>
    <WalletSetupConfirmationDialogShouldShowDIalogStreamGetter>
      {({ shouldShowDialog$ }) => (
        <WalletSetupFlowProvider flow={WalletSetupFlow.ADD_WALLET}>
          <Portal>
            <WalletSetupLayout>
              <Switch>
                <Route
                  path={onboardingPaths.create.root}
                  render={() => <SetupCreateWallet shouldShowDialog$={shouldShowDialog$} paths={onboardingPaths} />}
                />
                <Route
                  path={onboardingPaths.restore.root}
                  render={() => <SetupHardwareWallet shouldShowDialog$={shouldShowDialog$} paths={onboardingPaths} />}
                />
                <Route
                  path={onboardingPaths.hardware.root}
                  render={() => <SetupRestoreWallet shouldShowDialog$={shouldShowDialog$} paths={onboardingPaths} />}
                />
                <Route exact path={onboardingPaths.root} render={() => <Home paths={onboardingPaths} />} />
              </Switch>
            </WalletSetupLayout>
          </Portal>
        </WalletSetupFlowProvider>
      )}
    </WalletSetupConfirmationDialogShouldShowDIalogStreamGetter>
  </WalletSetupConfirmationDialogProvider>
);
