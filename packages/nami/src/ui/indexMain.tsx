/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Box, Spinner } from '@chakra-ui/react';
import {
  HashRouter,
  Switch,
  Route,
  useHistory,
  useLocation,
} from 'react-router-dom';

import { useAccountUtil } from '../adapters/account';
import { useAssets } from '../adapters/assets';
import { useBalance } from '../adapters/balance';
import { useFiatCurrency } from '../adapters/currency';
import { useChangePassword } from '../adapters/wallet';

import { useCommonOutsideHandles } from './../features/common-outside-handles-provider';
import { useOutsideHandles } from './../features/outside-handles-provider/useOutsideHandles';
import { HWConnectFlow } from './app/hw/hw';
import { SuccessAndClose } from './app/hw/success-and-close';
import Send from './app/pages/send';
import Settings from './app/pages/settings';
import Wallet from './app/pages/wallet';
import { Container } from './Container';
import { useStoreState, useStoreActions } from './store';
import { UpgradeToLaceHeader } from './UpgradeToLaceHeader';

const App = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const history = useHistory();
  const location = useLocation();

  const {
    addAccount: addLaceAccount,
    connectedDapps,
    fiatCurrency,
    theme,
    walletAddresses,
    isAnalyticsOptIn,
    currentChain,
    cardanoPrice,
    walletManager,
    walletRepository,
    setFiatCurrency,
    setTheme,
    removeDapp,
    createWallet,
    deleteWallet,
    handleAnalyticsChoice,
    environmentName,
    switchNetwork,
    availableChains,
    enableCustomNode,
    getCustomSubmitApiForNetwork,
    defaultSubmitApi,
    isValidURL,
    setAvatar,
    removeWallet,
  } = useOutsideHandles();

  const { inMemoryWallet, withSignTxConfirmation, cardanoCoin, openHWFlow } =
    useCommonOutsideHandles();

  const { currency, setCurrency } = useFiatCurrency(
    fiatCurrency,
    setFiatCurrency,
  );

  const changePassword = useChangePassword({
    chainId: currentChain,
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
    addAccount: async props => walletRepository.addAccount(props),
    activateWallet: async props => walletManager.activate(props),
    deleteWallet,
    createWallet,
  });

  const {
    allAccounts,
    activeAccount,
    nonActiveAccounts,
    addAccount,
    activateAccount,
    removeAccount,
    updateAccountMetadata,
  } = useAccountUtil({
    chainId: currentChain,
    addAccount: addLaceAccount,
    removeAccount: async props => walletRepository.removeAccount(props),
    removeWallet,
    activateAccount: async (props, force) =>
      walletManager.activate(props, force),
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
  });
  const balance = useBalance({ inMemoryWallet });
  const { assets, nfts } = useAssets({ inMemoryWallet, balance }) ?? [];

  const route = useStoreState(state => state.globalModel.routeStore.route);
  const setRoute = useStoreActions(
    actions => actions.globalModel.routeStore.setRoute,
  );

  const init = () => {
    if (route?.startsWith('/settings') || route?.startsWith('/send')) {
      route
        .slice(1)
        .split('/')
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce((acc, r) => {
          const fullRoute = acc + `/${r}`;
          history.push(fullRoute);
          return fullRoute;
        }, '');
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    init();
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      setRoute(location.pathname);
    }
  }, [location.pathname, isLoading, setRoute]);

  if (isLoading) {
    return (
      <Box
        height="full"
        width="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner color="teal" speed="0.5s" />
      </Box>
    );
  }

  return (
    <Box overflowX="hidden" minHeight="calc(100vh - 30px)">
      <Switch>
        <Route path="/settings">
          <Settings
            removeDapp={removeDapp}
            connectedDapps={connectedDapps}
            changePassword={changePassword}
            currency={currency}
            setCurrency={setCurrency}
            theme={theme}
            setTheme={setTheme}
            accountAvatar={activeAccount.avatar}
            accountName={activeAccount.name}
            isAnalyticsOptIn={isAnalyticsOptIn}
            handleAnalyticsChoice={handleAnalyticsChoice}
            updateAccountMetadata={updateAccountMetadata}
            environmentName={environmentName}
            switchNetwork={switchNetwork}
            availableChains={availableChains}
            enableCustomNode={enableCustomNode}
            getCustomSubmitApiForNetwork={getCustomSubmitApiForNetwork}
            defaultSubmitApi={defaultSubmitApi}
            isValidURL={isValidURL}
          />
        </Route>
        <Route path="/send">
          <Send
            accounts={nonActiveAccounts}
            activeAccount={activeAccount}
            updateAccountMetadata={updateAccountMetadata}
            currentChain={currentChain}
            activeAddress={walletAddresses[0]}
            inMemoryWallet={inMemoryWallet}
            withSignTxConfirmation={withSignTxConfirmation}
          />
        </Route>
        <Route exact path="/hwTab">
          <HWConnectFlow
            accounts={allAccounts}
            activateAccount={activateAccount}
          />
        </Route>
        <Route exact path="/hwTab/success">
          <SuccessAndClose />
        </Route>
        <Route path="*">
          <Wallet
            activeAddress={walletAddresses[0]}
            activeAccount={activeAccount}
            accounts={allAccounts}
            currency={currency}
            balance={balance.totalCoins}
            fiatPrice={cardanoPrice}
            lockedCoins={balance.lockedCoins}
            unspendableCoins={balance.unspendableCoins}
            cardanoCoin={cardanoCoin}
            addAccount={addAccount}
            activateAccount={activateAccount}
            removeAccount={removeAccount}
            assets={assets}
            nfts={nfts}
            setAvatar={setAvatar}
            openHWFlow={openHWFlow}
          />
        </Route>
      </Switch>
    </Box>
  );
};

export const Main = () => {
  const { theme, environmentName, switchWalletMode } = useOutsideHandles();
  return (
    <HashRouter>
      <Container environmentName={environmentName} theme={theme}>
        <UpgradeToLaceHeader switchWalletMode={switchWalletMode} />
        <App />
      </Container>
    </HashRouter>
  );
};
