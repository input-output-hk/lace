/* eslint-disable functional/immutable-data, @typescript-eslint/no-unsafe-assignment */
import type { ReactElement } from 'react';
import React, { useRef, useState } from 'react';

import { Box, Image, useColorModeValue } from '@chakra-ui/react';

import LogoOriginal from '../../../assets/img/logo.svg';
import LogoWhite from '../../../assets/img/logoWhite.svg';

import { ConnectHW } from './connect-hw';
import { SelectAccounts } from './select-account';
import { SuccessAndClose } from './success-and-close';

import type { HardwareDeviceInfo } from './types';

export const HWConnectFlow = (): ReactElement => {
  const Logo = useColorModeValue(LogoOriginal, LogoWhite);
  const cardColor = useColorModeValue('white', 'gray.900');
  const backgroundColor = useColorModeValue('gray.200', 'gray.800');
  const [tab, setTab] = useState(0);
  const data = useRef<HardwareDeviceInfo>({ device: '', id: 0 });

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
        {tab === 0 && (
          <ConnectHW
            onConfirm={({ device, id }): void => {
              data.current = { device, id };
              setTab(1);
            }}
          />
        )}
        {tab === 1 && (
          <SelectAccounts
            data={data.current}
            onConfirm={(): void => {
              setTab(2);
            }}
          />
        )}
        {tab === 2 && <SuccessAndClose />}
      </Box>
    </Box>
  );
};
