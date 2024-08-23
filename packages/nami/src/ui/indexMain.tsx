import React from 'react';

import { Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import { useInitializeNamiMetadata, useAccount } from '../adapters/account';
import { useBalance } from '../adapters/balance';
import { useCollateral } from '../adapters/collateral';
import { useFiatCurrency } from '../adapters/currency';
import {
  useChangePassword,
  useDeleteWalletWithPassword,
} from '../adapters/wallet';

import Send from './app/pages/send';
import Settings from './app/pages/settings';
import Wallet from './app/pages/wallet';
import { Container } from './Container';

import { useOutsideHandles } from './index';

export const Main = () => {
  const {
    collateralFee,
    isInitializingCollateral,
    connectedDapps,
    fiatCurrency,
    theme,
    walletAddress,
    inMemoryWallet,
    isAnalyticsOptIn,
    currentChain,
    cardanoPrice,
    walletManager,
    walletRepository,
    submitCollateralTx,
    initializeCollateralTx,
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
  } = useOutsideHandles();

  const { currency, setCurrency } = useFiatCurrency(
    fiatCurrency,
    setFiatCurrency,
  );

  const deleteWalletWithPassword = useDeleteWalletWithPassword({
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    deleteWallet,
  });

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

  const { accounts, activeAccount, updateAccountMetadata } = useAccount({
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
  });
  const balance = useBalance({ inMemoryWallet });
  const { hasCollateral, reclaimCollateral, submitCollateral } = useCollateral({
    inMemoryWallet,
    submitCollateralTx,
    withSignTxConfirmation,
  });

  useInitializeNamiMetadata({
    addresses$: inMemoryWallet.addresses$,
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
  });

  return (
    <Router>
      <Container environmentName={environmentName}>
        <Box overflowX="hidden">
          <Switch>
            <Route path="/settings/*">
              <Settings
                removeDapp={removeDapp}
                connectedDapps={connectedDapps}
                changePassword={changePassword}
                deleteWallet={deleteWalletWithPassword}
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
                accounts={accounts}
                activeAccount={activeAccount}
                updateAccountMetadata={updateAccountMetadata}
                currentChain={currentChain}
                walletAddress={walletAddress}
                inMemoryWallet={inMemoryWallet}
                withSignTxConfirmation={withSignTxConfirmation}
              />
            </Route>
            <Route path="*">
              <Wallet
                walletAddress={walletAddress}
                hasCollateral={hasCollateral}
                isInitializingCollateral={isInitializingCollateral}
                collateralFee={collateralFee}
                currency={currency}
                accountName={activeAccount.name}
                accountAvatar={activeAccount.avatar}
                balance={balance.totalCoins}
                fiatPrice={cardanoPrice}
                lockedCoins={balance.lockedCoins}
                unspendableCoins={balance.unspendableCoins}
                cardanoCoin={cardanoCoin}
                reclaimCollateral={reclaimCollateral}
                submitCollateral={submitCollateral}
                initializeCollateral={initializeCollateralTx}
              />
            </Route>
          </Switch>
        </Box>
      </Container>
    </Router>
  );
};
