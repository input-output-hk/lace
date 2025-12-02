/*eslint-disable @typescript-eslint/no-misused-promises */
import type { ReactElement } from 'react';
import React from 'react';

import { Box, Button, Text } from '@chakra-ui/react';
import { Planet } from 'react-kawaii';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';

import { HWFlowContainer } from './hw';

export const SuccessAndClose = (): ReactElement => {
  const capture = useCaptureEvent();

  return (
    <HWFlowContainer>
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
    </HWFlowContainer>
  );
};
