import React from 'react';

import { Box, Spinner } from '@chakra-ui/react';

import { Container } from './Container';

import { useOutsideHandles } from './index';

export const Main = () => {
  const { fullWalletName, transformedCardano, walletAddress } =
    useOutsideHandles();

  return (
    <Container>
      {fullWalletName ? (
        <Box padding="4">
          <Box>{fullWalletName}</Box>
          <Box>{walletAddress}</Box>
          <Box>
            {transformedCardano.balance} {transformedCardano.ticker}
          </Box>
          <Box>{transformedCardano.fiatBalance}</Box>
        </Box>
      ) : (
        <Box
          height="full"
          width="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner color="teal" speed="0.5s" />
        </Box>
      )}
    </Container>
  );
};
