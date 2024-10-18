/* eslint-disable functional/prefer-immutable-types */
import React, { useMemo } from 'react';

import {
  Box,
  Text,
  Button,
  Image,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { Wallet } from '@lace/cardano';

import { ERROR } from '../../../../config/config';
import { Events } from '../../../../features/analytics/events';
import { useCaptureEvent } from '../../../../features/analytics/hooks';
import { useCommonOutsideHandles } from '../../../../features/common-outside-handles-provider';
import Account from '../../components/account';
import ConfirmModal from '../../components/confirmModal';
import { Scrollbars } from '../../components/scrollbar';

import type { UseAccount } from '../../../../adapters/account';
import type { DappConnector } from '../../../../features/dapp-outside-handles-provider';

interface Props {
  dappConnector: DappConnector;
  account: UseAccount['activeAccount'];
}

export const SignData = ({ dappConnector, account }: Readonly<Props>) => {
  const capture = useCaptureEvent();
  const ref = React.useRef();
  const [payload, setPayload] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [dappInfo, setDappInfo] = React.useState<Wallet.DappInfo>();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [request, setRequest] =
    React.useState<
      Awaited<ReturnType<typeof dappConnector.getSignDataRequest>>['request']
    >();
  const background = useColorModeValue('gray.100', 'gray.700');

  const getPayload = (payload: Readonly<Wallet.HexBlob>) => {
    const payloadUtf8 = Buffer.from(payload, 'hex').toString('utf8');
    setPayload(payloadUtf8);
  };

  const { walletType } = useCommonOutsideHandles();

  const signDataMsg = useMemo(() => {
    const result: JSX.Element[] = [];
    for (const line of payload.split(/\r?\n/)) {
      result.push(
        <p style={{ wordBreak: 'break-word', paddingBlockEnd: '8px' }}>
          {line}
        </p>,
      );
    }
    return result;
  }, [payload]);

  const getAddress = (
    address:
      | Wallet.Cardano.DRepID
      | Wallet.Cardano.PaymentAddress
      | Wallet.Cardano.RewardAccount,
  ) => {
    const addressObj = Wallet.Cardano.Address.fromString(address);
    if (!addressObj) {
      console.error('SignData: Invalid address', address);
      setAddress('unknown');
      return;
    }

    if (Wallet.Cardano.isRewardAccount(address)) {
      setAddress('stake');
    } else {
      setAddress('payment');
    }
  };

  const loadData = async () => {
    const { dappInfo, request } = await dappConnector.getSignDataRequest();
    getPayload(request.data.payload);
    getAddress(request.data.address);
    setDappInfo(dappInfo);
    setRequest(request);
    setIsLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);
  return (
    <>
      {isLoading ? (
        <Box
          height="100vh"
          width="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner color="teal" speed="0.5s" />
        </Box>
      ) : (
        <Box
          minHeight="100vh"
          display="flex"
          alignItems="center"
          flexDirection="column"
          position="relative"
        >
          <Account name={account.name} avatar={account.avatar} />
          <Box h="4" />
          <Box
            display={'flex'}
            alignItems={'center'}
            justifyContent={'left'}
            width={'full'}
          >
            <Box w="6" />
            <Box
              width={8}
              height={8}
              background={background}
              rounded={'xl'}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
            >
              <Image
                draggable={false}
                width={4}
                height={4}
                src={dappInfo?.logo}
              />
            </Box>
            <Box w="3" />
            <Text fontSize={'xs'} fontWeight="bold">
              {dappInfo?.url.split('//')[1]}
            </Text>
          </Box>
          <Box h="8" />
          <Box>This app requests a signature for:</Box>
          <Box h="4" />
          <Box
            width="76%"
            height="278px"
            rounded="xl"
            background={background}
            padding="2.5"
            wordBreak="break-all"
          >
            <Scrollbars autoHide>{signDataMsg}</Scrollbars>
          </Box>

          <Box
            position="absolute"
            width="full"
            bottom="3"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection={'column'}
          >
            <Box py={2} px={4} rounded={'full'} background={background}>
              {error ? (
                <Text wordBreak="break-all" fontSize="xs" color="red.300">
                  {error}
                </Text>
              ) : (
                <Text fontSize="xs">
                  Signing with{' '}
                  <Box
                    as={'b'}
                    color={
                      address == 'payment'
                        ? 'teal.400'
                        : address == 'stake'
                          ? 'orange'
                          : 'inherit'
                    }
                  >
                    {address}
                  </Box>{' '}
                  key
                </Text>
              )}
            </Box>
            <Box h={6} />
            <Box
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              width={'full'}
            >
              <Button
                height={'50px'}
                width={'180px'}
                onClick={async () => {
                  await capture(Events.DappConnectorDappDataCancelClick);
                  await request?.reject(() => {
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
                isDisabled={!!error}
                colorScheme="teal"
                onClick={() => {
                  capture(Events.DappConnectorDappDataSignClick);
                  (ref.current as any)?.openModal(account.index);
                }}
              >
                Sign
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      <ConfirmModal
        ref={ref}
        walletType={walletType}
        sign={async password => {
          try {
            await request?.sign(password ?? '');
          } catch (error) {
            if (
              error instanceof Wallet.KeyManagement.errors.AuthenticationError
            ) {
              setError(ERROR.wrongPassword);
              throw ERROR.wrongPassword;
            }
            throw error;
          }
        }}
        onCloseBtn={() => {
          capture(Events.DappConnectorDappDataCancelClick);
        }}
        onConfirm={async status => {
          if (status) {
            await capture(Events.DappConnectorDappDataConfirmClick);
            const channelCloseDelay = 100;
            setTimeout(() => {
              window.close();
            }, channelCloseDelay);
          }
        }}
      />
    </>
  );
};
