/* eslint-disable unicorn/no-null */
/* eslint-disable functional/immutable-data, @typescript-eslint/no-unsafe-assignment */
import type { ReactElement } from 'react';
import React, { useState } from 'react';

import { Box, Image, useColorModeValue } from '@chakra-ui/react';
import { useHistory } from 'react-router-dom';

import LogoOriginal from '../../../assets/img/logo.svg';
import LogoWhite from '../../../assets/img/logoWhite.svg';

import { ConnectHW } from './connect-hw';
import { SelectAccounts } from './select-account';

import type { UseAccount } from '../../../adapters/account';
import type { Wallet } from '@lace/cardano';

export const HWFlowContainer = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const Logo = useColorModeValue(LogoOriginal, LogoWhite);
  const cardColor = useColorModeValue('white', 'gray.900');
  const backgroundColor = useColorModeValue('gray.200', 'gray.800');

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="100vw"
      height="100vh"
      position="relative"
      background={backgroundColor}
    >
      <Box position="absolute" left="40px" top="40px">
        <Image draggable={false} src={Logo} width="36px" />
      </Box>

      <Box
        rounded="2xl"
        shadow="md"
        display="flex"
        alignItems="center"
        flexDirection="column"
        width="90%"
        maxWidth="460px"
        maxHeight="550px"
        height="70vh"
        p={10}
        background={cardColor}
        fontSize="sm"
      >
        {children}
      </Box>
    </Box>
  );
};

export const HWConnectFlow = ({
  accounts,
  activateAccount,
}: Readonly<{
  accounts: UseAccount['allAccounts'];
  activateAccount: UseAccount['activateAccount'];
}>): ReactElement => {
  const history = useHistory();
  const [connection, setConnection] =
    useState<Wallet.HardwareWalletConnection | null>(null);

  return (
    <HWFlowContainer>
      {!connection && (
        <ConnectHW
          onConfirm={(data): void => {
            setConnection(data);
          }}
        />
      )}
      {connection && (
        <SelectAccounts
          accounts={accounts}
          activateAccount={activateAccount}
          connection={connection}
          onConfirm={(): void => {
            history.push('/hwTab/success');
          }}
        />
      )}
    </HWFlowContainer>
  );
};
