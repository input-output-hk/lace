import React from 'react';

import { Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import Send from './app/pages/send';
import { Container } from './Container';

import { useOutsideHandles } from './index';

export const Main = () => {
  const {
    walletAddress,
    inMemoryWallet,
    currentChain,
    withSignTxConfirmation,
  } = useOutsideHandles();

  return (
    <Router>
      <Container>
        <Box overflowX="hidden">
          <Switch>
            <Route path="*">
              <Send
                currentChain={currentChain}
                walletAddress={walletAddress}
                inMemoryWallet={inMemoryWallet}
                withSignTxConfirmation={withSignTxConfirmation}
              />
            </Route>
          </Switch>
        </Box>
      </Container>
    </Router>
  );
};
