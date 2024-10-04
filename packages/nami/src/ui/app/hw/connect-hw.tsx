/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-assignment */
import type { ReactElement } from 'react';
import React from 'react';

import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box, Button, Icon, Image, Text, useColorMode } from '@chakra-ui/react';
import { MdUsb } from 'react-icons/md';

import LedgerLogo from '../../../assets/img/ledgerLogo.svg';
import TrezorLogo from '../../../assets/img/trezorLogo.svg';
import { HW } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';

import type { Wallet } from '@lace/cardano';

interface ConnectHWProps {
  onConfirm: (data: Readonly<Wallet.HardwareWalletConnection>) => void;
}

const MANUFACTURER: Record<string, string> = {
  ledger: 'Ledger',
  trezor: 'SatoshiLabs',
};

export const ConnectHW = ({ onConfirm }: ConnectHWProps): ReactElement => {
  const capture = useCaptureEvent();
  const { connectHW } = useOutsideHandles();
  const { colorMode } = useColorMode();
  const [selected, setSelected] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSetSelectedDevice = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      let connectionResult: Wallet.HardwareWalletConnection | null = null;
      const device = await navigator.usb.requestDevice({
        filters: [],
      });
      if (device.manufacturerName !== MANUFACTURER[selected]) {
        setError(
          `Device is not a ${selected === HW.ledger ? 'Ledger' : 'Trezor'}`,
        );
        setIsLoading(false);
        return;
      }

      try {
        connectionResult = await connectHW(device);
      } catch {
        setError('Cardano app not opened');
        setIsLoading(false);
        return;
      }

      if (connectionResult) {
        void capture(Events.HWConnectNextClick);
        onConfirm(connectionResult);
        return;
      }
    } catch {
      setError('Device not found');
    }

    setIsLoading(false);
  };

  return (
    <>
      <Text fontSize="x-large" fontWeight="semibold">
        Connect Hardware Wallet
      </Text>
      <Box h={6} />
      <Text width="300px">
        Choose the hardware wallet you would like to use with Nami.
      </Text>
      <Box h={8} />
      <Box display="flex" alignItems="center" justifyContent="center">
        <Box
          cursor="pointer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="120px"
          height="55px"
          border="solid 1px"
          rounded="xl"
          borderColor={selected === HW.trezor ? 'teal.400' : ''}
          borderWidth={selected === HW.trezor ? '3px' : ''}
          p={4}
          _hover={{ opacity: 0.8 }}
          onClick={(): void => {
            setSelected(HW.trezor);
          }}
          data-testid="trezor"
        >
          <Image
            draggable={false}
            src={TrezorLogo}
            filter={colorMode == 'dark' ? 'invert(1)' : ''}
          />
        </Box>
        <Box w={5} />
        <Box
          cursor="pointer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="120px"
          height="55px"
          border="solid 1px"
          rounded="xl"
          borderColor={selected === HW.ledger ? 'teal.400' : ''}
          borderWidth={selected === HW.ledger ? '3px' : ''}
          p={1}
          _hover={{ opacity: 0.8 }}
          onClick={(): void => {
            setSelected(HW.ledger);
          }}
          data-testid="ledger"
        >
          <Image
            draggable={false}
            src={LedgerLogo}
            filter={colorMode == 'dark' ? 'invert(1)' : ''}
          />
        </Box>
      </Box>
      <Box h={10} />
      {selected === HW.trezor && (
        <Text width="300px">
          Connect your <b>Trezor</b> device directly to your computer. Unlock
          the device and then click Continue.
        </Text>
      )}
      {selected === HW.ledger && (
        <Text width="300px">
          Connect your <b>Ledger</b> device directly to your computer. Unlock
          the device and open the Cardano app. Then click Continue.
        </Text>
      )}
      {selected && <Icon as={MdUsb} boxSize={7} mt="6" />}
      <Button
        isDisabled={isLoading || !selected}
        isLoading={isLoading}
        mt="auto"
        rightIcon={<ChevronRightIcon />}
        onClick={handleSetSelectedDevice}
      >
        Continue
      </Button>

      {error && (
        <Text mt={3} fontSize="xs" color="red.300">
          {error}
        </Text>
      )}
    </>
  );
};
