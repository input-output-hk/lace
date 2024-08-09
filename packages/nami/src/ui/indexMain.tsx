import React from 'react';

import { Box } from '@chakra-ui/react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';

import {
  useInitializeNamiMetadata,
  useUpdateAccount,
} from '../adapters/account';
import { useFiatCurrency } from '../adapters/currency';
import {
  useChangePassword,
  useDeleteWalletWithPassword,
} from '../adapters/wallet';

import Send from './app/pages/send';
import Settings from './app/pages/settings';
import { Container } from './Container';

import { useOutsideHandles } from './index';

export const Main = () => {
  const {
    createWallet,
    getMnemonic,
    deleteWallet,
    fiatCurrency,
    setFiatCurrency,
    theme,
    setTheme,
    walletAddress,
    inMemoryWallet,
    currentChain,
    walletManager,
    walletRepository,
    withSignTxConfirmation,
  } = useOutsideHandles();

  const { currency, setCurrency } = useFiatCurrency(
    fiatCurrency,
    setFiatCurrency,
  );

  const { accountName, accountAvatar, updateAccountMetadata } =
    useUpdateAccount({
      wallets$: walletRepository.wallets$,
      activeWalletId$: walletManager.activeWalletId$,
      updateAccountMetadata: async props =>
        walletRepository.updateAccountMetadata(props),
    });

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

  useInitializeNamiMetadata({
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
    updateAccountMetadata: async props =>
      walletRepository.updateAccountMetadata(props),
  });

  return (
    <Router>
      <Container>
        <Box overflowX="hidden">
          <Switch>
            <Route path="/settings/*">
              <Settings
                changePassword={changePassword}
                deleteWallet={deleteWalletWithPassword}
                currency={currency}
                setCurrency={setCurrency}
                theme={theme}
                setTheme={setTheme}
                accountAvatar={accountAvatar}
                accountName={accountName}
                updateAccountMetadata={updateAccountMetadata}
              />
            </Route>
            <Route path="/send">
              <Send
                accountName={accountName}
                accountAvatar={accountAvatar}
                currentChain={currentChain}
                walletAddress={walletAddress}
                inMemoryWallet={inMemoryWallet}
                withSignTxConfirmation={withSignTxConfirmation}
              />
            </Route>
            <Redirect from="*" to="/settings/" />
          </Switch>
        </Box>
      </Container>
    </Router>
  );
};
