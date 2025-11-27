import { useKeyboardShortcut } from '@lace/common';
import { Redirect, Route, Switch, useRouteMatch } from 'react-router-dom';
import { CreateWallet } from './create-wallet';
import { HardwareWallet } from './hardware-wallet';
import { RestoreWallet } from './restore-wallet';
import React, { ReactNode, VFC } from 'react';
import { Flows, WalletOnboardingPostHogActions, SetFormDirty } from './types';
import { WalletOnboardingProvider } from './walletOnboardingContext';

type WalletOnboardingProps = {
  aliasEventRequired?: boolean;
  mergeEventRequired?: boolean;
  flowsEnabled?: boolean;
  forgotPasswordFlowActive?: boolean;
  postHogActions: WalletOnboardingPostHogActions;
  renderHome: () => ReactNode;
  setFormDirty?: SetFormDirty;
  urlPath: Record<Flows, string>;
};

export const WalletOnboardingFlows: VFC<WalletOnboardingProps> = ({
  aliasEventRequired = false,
  mergeEventRequired = false,
  flowsEnabled = true,
  forgotPasswordFlowActive = false,
  postHogActions,
  renderHome,
  setFormDirty = () => void 0,
  urlPath
}) => {
  useKeyboardShortcut(['Enter'], (event) => {
    const nextBnt: HTMLButtonElement = document.querySelector('[data-testid="wallet-setup-step-btn-next"]');
    const confirmGoBack: HTMLButtonElement = document.querySelector('[data-testid="delete-address-modal-confirm"]');

    if (confirmGoBack) {
      confirmGoBack.click();
    } else if (nextBnt && !nextBnt.getAttribute('disabled')) {
      event.preventDefault();
      nextBnt.click();
    }
  });

  const { path } = useRouteMatch();
  return (
    <WalletOnboardingProvider
      value={{ aliasEventRequired, mergeEventRequired, forgotPasswordFlowActive, postHogActions, setFormDirty }}
    >
      <Switch>
        <Route exact path={`${path}/`} render={renderHome} />
        {flowsEnabled && (
          <>
            <Route path={urlPath.create} component={CreateWallet} />
            <Route path={urlPath.hardware} component={HardwareWallet} />
            <Route path={urlPath.restore} component={RestoreWallet} />
          </>
        )}
        {!flowsEnabled && <Redirect to={`${path}/`} />}
      </Switch>
    </WalletOnboardingProvider>
  );
};
