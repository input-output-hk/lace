import React, { useEffect, useMemo, useState } from 'react';

import { CheckIcon } from '@chakra-ui/icons';
import { Box, Button, Text, Image, useColorModeValue } from '@chakra-ui/react';

import { Events } from '../../../../features/analytics/events';
import { useCaptureEvent } from '../../../../features/analytics/hooks';
import Account from '../../components/account';

import type { DappConnector } from 'features/outside-handles-provider';

interface Props {
  dappConnector: DappConnector;
  controller: (
    authorization: 'allow' | 'deny',
    url: string,
    cleanupCb: () => void,
  ) => void;
  accountName: string;
  accountAvatar?: string;
}

export const Enable = ({
  dappConnector,
  controller,
  accountName,
  accountAvatar,
}: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const background = useColorModeValue('gray.100', 'gray.700');
  const containerBg = useColorModeValue('white', 'gray.800');

  const [dappInfo, setDappInfo] = useState<{
    logo: string;
    name: string;
    url: string;
    domain: string;
  }>();
  useEffect(() => {
    dappConnector
      .getDappInfo()
      .then(({ logo, name, url }) => {
        setDappInfo({ logo, name, url, domain: url.split('//')[1] });
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      flexDirection="column"
      position="relative"
      background={containerBg}
    >
      <Account name={accountName} avatar={accountAvatar} />
      <Box h={14} />
      <Box
        display="flex"
        alignItems="center"
        flexDirection="column"
        justifyContent="center"
      >
        <Box
          width={10}
          height={10}
          background={background}
          rounded={'xl'}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
        >
          <Image draggable={false} width={6} height={6} src={dappInfo?.logo} />
        </Box>
        <Box height="3" />
        <Text fontWeight="bold">{dappInfo?.domain ?? 'loading...'}</Text>
        <Box h={14} />
        <Box>This app would like to:</Box>
        <Box h={4} />
        <Box
          p={6}
          background={background}
          rounded="xl"
          display={'flex'}
          justifyContent={'center'}
          flexDirection={'column'}
        >
          <Box display={'flex'} alignItems={'center'}>
            <CheckIcon mr="3" color={'teal'} boxSize={4} />{' '}
            <Box fontWeight={'bold'}>View your balance and addresses</Box>
          </Box>
          <Box h={4} />
          <Box display={'flex'} alignItems={'center'}>
            <CheckIcon mr="3" color={'teal'} boxSize={4} />{' '}
            <Box fontWeight={'bold'}>Request approval for transactions</Box>
          </Box>
        </Box>
        <Box h={6} />
        <Box color={'GrayText'}>Only connect with sites you trust</Box>
      </Box>
      <Box
        position="absolute"
        width="full"
        bottom="3"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Button
          height={'50px'}
          width={'180px'}
          onClick={() => {
            capture(Events.DappConnectorAuthorizeDappCancelClick);
            controller('deny', dappInfo?.url ?? '', () => {
              window.close();
            });
          }}
        >
          Cancel
        </Button>
        <Box w={3} />
        <Button
          height={'50px'}
          width={'180px'}
          colorScheme="teal"
          onClick={() => {
            capture(Events.DappConnectorAuthorizeDappAuthorizeClick);
            controller('allow', dappInfo?.url ?? '', () => {
              window.close();
            });
          }}
        >
          Access
        </Button>
      </Box>
    </Box>
  );
};
