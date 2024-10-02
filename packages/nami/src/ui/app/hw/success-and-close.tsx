/*eslint-disable @typescript-eslint/no-misused-promises */
import React from 'react';
import type { ReactElement } from 'react';

import { Box, Image, Button, Text, useColorModeValue } from '@chakra-ui/react';
import { Planet } from 'react-kawaii';

import LogoOriginal from '../../../assets/img/logo.svg';
import LogoWhite from '../../../assets/img/logoWhite.svg';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';

export const SuccessAndClose = (): ReactElement => {
  const capture = useCaptureEvent();
  const cardColor = useColorModeValue('white', 'gray.900');
  const backgroundColor = useColorModeValue('gray.200', 'gray.800');
  const Logo = useColorModeValue(LogoOriginal, LogoWhite);

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
        <Text
          mt={10}
          fontSize="x-large"
          fontWeight="semibold"
          width={200}
          textAlign="center"
        >
          Successfully added accounts!
        </Text>
        <Box h={6} />
        <Planet mood="blissful" size={150} color="#61DDBC" />
        <Box h={10} />
        <Text width="300px">
          You can now close this tab and continue with the extension.
        </Text>
        <Button
          mt="auto"
          onClick={(): void => {
            void (async () => {
              await capture(Events.HWDoneGoToWallet);
              window.close();
            })();
          }}
        >
          Close
        </Button>
      </Box>
    </Box>
  );
};
