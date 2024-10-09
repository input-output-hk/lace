import React from 'react';

import { Box } from '@chakra-ui/react';
import { HashRouter, Switch, Route } from 'react-router-dom';

import { useAccount } from '../adapters/account';
import { useOutsideHandles } from '../features/outside-handles-provider/useOutsideHandles';

import { TrezorTx } from './app/hw/trezorTx';
import { Enable } from './app/pages/dapp-connector/enable';
import { SignData } from './app/pages/dapp-connector/signData';
import { SignTx } from './app/pages/dapp-connector/signTx';
import { Container } from './Container';

export const Main = () => {
  const {
    theme,
    inMemoryWallet,
    walletManager,
    walletRepository,
    environmentName,
    dappConnector,
  } = useOutsideHandles();

  const { activeAccount } = useAccount({
    wallets$: walletRepository.wallets$,
    activeWalletId$: walletManager.activeWalletId$,
  });

  return (
    <HashRouter>
      <Container environmentName={environmentName} theme={theme}>
        <Box overflowX="hidden">
          <Switch>
            <Route exact path="/hwTab/trezorTx/:cbor/:setCollateral?">
              <TrezorTx />
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
          </Switch>
        </Box>
      </Container>
    </HashRouter>
  );
};
