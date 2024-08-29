import React from 'react';

import { Box } from '@chakra-ui/react';
import { HashRouter, Switch, Route } from 'react-router-dom';

import { useAccount } from '../adapters/account';
import { useAssets } from '../adapters/assets';
import { useBalance } from '../adapters/balance';
import { useFiatCurrency } from '../adapters/currency';
import { useChangePassword } from '../adapters/wallet';

import { HWConnectFlow } from './app/hw/hw';
import { SuccessAndClose } from './app/hw/success-and-close';
import Send from './app/pages/send';
import Settings from './app/pages/settings';
import Wallet from './app/pages/wallet';
import { Container } from './Container';
import { UpgradeToLaceHeader } from './UpgradeToLaceHeader';

import { Enable, SignTx, SignData, useOutsideHandles } from './index';

export const Main = () => {
  const {
    addAccount: addLaceAccount,
    connectedDapps,
    fiatCurrency,
    theme,
    walletAddresses,
    inMemoryWallet,
    isAnalyticsOptIn,
    currentChain,
    cardanoPrice,
    walletManager,
    walletRepository,
    setFiatCurrency,
    setTheme,
    removeDapp,
    createWallet,
    getMnemonic,
    deleteWallet,
    handleAnalyticsChoice,
    withSignTxConfirmation,
    environmentName,
    switchNetwork,
    availableChains,
    enableCustomNode,
    getCustomSubmitApiForNetwork,
    defaultSubmitApi,
    cardanoCoin,
    isValidURL,
    setAvatar,
    switchWalletMode,
    openHWFlow,
    dappConnector,
  } = useOutsideHandles();

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
    getMnemonic,
  });

  const {
    allAccounts,
    activeAccount,
    nonActiveAccounts,
    addAccount,
    activateAccount,
    removeAccount,
    updateAccountMetadata,
  } = useAccount({
    chainId: currentChain,
    addAccount: addLaceAccount,
    removeAccount: async props => walletRepository.removeAccount(props),
    removeWallet: async props => walletRepository.removeWallet(props),
    activateAccount: async (props, force) =>
      walletManager.activate(props, force),
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
  });
  const balance = useBalance({ inMemoryWallet });
  const { assets, nfts } = useAssets({ inMemoryWallet, balance }) ?? [];

  return (
    <HashRouter>
      <Container environmentName={environmentName} theme={theme}>
        <UpgradeToLaceHeader switchWalletMode={switchWalletMode} />
        <Box overflowX="hidden">
          <Switch>
            <Route path="/settings/*">
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
            <Route path="/dapp/connect">
              <Enable
                dappConnector={dappConnector}
                controller={dappConnector.authorizeDapp}
                accountAvatar={activeAccount.avatar}
                accountName={activeAccount.name}
              />
            </Route>
            <Route path="/dapp/sign-tx">
              <SignTx
                dappConnector={dappConnector}
                inMemoryWallet={inMemoryWallet}
                account={activeAccount}
              />
            </Route>
            <Route path="/dapp/sign-data">
              <SignData dappConnector={dappConnector} account={activeAccount} />
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
      </Container>
    </HashRouter>
  );
};
