import React from 'react';
import { Redirect, Switch, Route } from 'react-router-dom';
import { ReceiveInfoContainer } from '../features/receive-info/components';
import { Activity } from '../features/activity/components';
import { MainLayout } from '../components/Layout';
import { PopupAssets } from '../features/assets';
import { Send } from '../features/send';
import { walletRoutePaths } from './wallet-paths';
import { DelegationContainer } from '../features/delegation';
import { StakingWarningModals } from '@views/browser/features/staking/components/StakingModals';
import { AddressBook } from '../features/address-book';
import { Settings } from '../features/settings';
import { SignMessageDrawer } from '@views/browser/features/sign-message/SignMessageDrawer';
import { NftDetail, Nfts } from '@src/features/nfts';
import { useWalletStore } from '@stores';
import { config } from '@src/config';
import { Voting } from '@src/features/voting-beta/components';

const { GOV_TOOLS_URLS } = config();

export const ExtensionRoutes = (): React.ReactElement => {
  const { isSharedWallet, environmentName } = useWalletStore();

  return (
    <MainLayout>
      <Switch>
        <Route exact path={walletRoutePaths.assets} component={PopupAssets} />
        <Route exact path={walletRoutePaths.receive} component={ReceiveInfoContainer} />
        <Route exact path={walletRoutePaths.activity} component={Activity} />
        <Route exact path={walletRoutePaths.send} component={Send} />
        <Route exact path={walletRoutePaths.nftDetail} component={NftDetail} />
        {!isSharedWallet && <Route exact path={walletRoutePaths.earn} component={DelegationContainer} />}
        <Route exact path={walletRoutePaths.addressBook} component={AddressBook} />
        <Route exact path={walletRoutePaths.settings} component={Settings} />
        <Route exact path={walletRoutePaths.signMessage} component={SignMessageDrawer} />
        <Route exact path={walletRoutePaths.nfts} component={Nfts} />
        {GOV_TOOLS_URLS[environmentName] && <Route exact path={walletRoutePaths.voting} component={Voting} />}
        <Route path="*" render={() => <Redirect to={walletRoutePaths.assets} />} />
      </Switch>
      {/* TODO: LW-7575 Remove old staking in post-MVP of multi delegation staking.*/}
      <StakingWarningModals popupView />
    </MainLayout>
  );
};
