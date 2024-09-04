/* eslint-disable @typescript-eslint/no-misused-promises, unicorn/no-null, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call, functional/immutable-data, @typescript-eslint/no-unsafe-assignment */

import type { ReactElement } from 'react';
import React from 'react';

import { HARDENED } from '@cardano-foundation/ledgerjs-hw-app-cardano';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box, Button, Checkbox, Text } from '@chakra-ui/react';
import TrezorConnect from '@trezor/connect-web';

import {
  getHwAccounts,
  indexToHw,
  createHWAccounts,
  initHW,
} from '../../../api/extension';
import { HW } from '../../../config/config';
import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { Scrollbars } from '../components/scrollbar';
import TrezorWidget from '../components/TrezorWidget';

import type { HardwareDeviceInfo } from './types';

interface SelectAccountsProps {
  data: HardwareDeviceInfo;
  onConfirm: () => void;
}

export const SelectAccounts = ({
  data,
  onConfirm,
}: Readonly<SelectAccountsProps>): ReactElement | null => {
  const capture = useCaptureEvent();
  const [selected, setSelected] = React.useState({ 0: true });
  const [error, setError] = React.useState('');
  const trezorReference = React.useRef();
  const [existing, setExisting] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInit, setIsInit] = React.useState(false);

  React.useEffect(() => {
    const getExistingAccounts = async (): Promise<void> => {
      const hwAccounts = await getHwAccounts({
        device: data.device,
        id: data.id,
      });

      const existing = {};
      // eslint-disable-next-line functional/no-loop-statements
      for (const accountIndex of Object.keys(hwAccounts))
        existing[indexToHw(accountIndex).account] = true;
      setExisting(existing);
      setIsInit(true);
    };

    getExistingAccounts().catch(error => {
      console.error('Error getting existing accounts:', error);
    });
  }, []);

  const handleSelectAccount = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    const accountIndexes = Object.keys(selected).filter(
      currentState => selected[currentState] && !existing[currentState],
    );
    try {
      const { device, id } = data;
      // eslint-disable-next-line functional/no-let
      let accounts;
      if (device === HW.ledger) {
        const appAda = await initHW({ device, id });
        const ledgerKeys = await appAda.getExtendedPublicKeys({
          paths: accountIndexes.map(index => [
            HARDENED + 1852,
            HARDENED + 1815,
            HARDENED + Number.parseInt(index),
          ]),
        });
        accounts = ledgerKeys.map(
          (
            {
              publicKeyHex,
              chainCodeHex,
            }: Readonly<{ publicKeyHex: string; chainCodeHex: string }>,
            index: number,
          ) => ({
            accountIndex: `${HW.ledger}-${id}-${accountIndexes[index]}`,
            publicKey: publicKeyHex + chainCodeHex,
            name: `Ledger ${Number.parseInt(accountIndexes[index]) + 1}`,
          }),
        );
      } else if (device == HW.trezor) {
        await initHW({ device, id });
        const trezorKeys = await TrezorConnect.cardanoGetPublicKey({
          bundle: accountIndexes.map(index => ({
            path: `m/1852'/1815'/${Number.parseInt(index)}'`,
            showOnTrezor: false,
          })),
        });
        if (!trezorKeys.success) {
          trezorReference.current.closeModal();
        }
        accounts = trezorKeys.payload.map(({ publicKey }, index) => ({
          accountIndex: `${HW.trezor}-${id}-${accountIndexes[index]}`,
          publicKey,
          name: `Trezor ${Number.parseInt(accountIndexes[index]) + 1}`,
        }));
        trezorReference.current.closeModal();
      }
      await createHWAccounts(accounts);
      void capture(Events.HWSelectAccountNextClick, {
        numAccounts: accountIndexes.length,
      });
      onConfirm();
      return;
    } catch (error_) {
      console.log(error_);
      setError('An error occured');
    }

    setIsLoading(false);
  };

  if (!isInit) return null;

  return (
    <>
      <Text fontSize="x-large" fontWeight="semibold">
        Select Accounts
      </Text>
      <Box h={6} />
      <Text width="300px">
        Select the accounts you would like to import. Afterwards click Continue
        and follow the instructions on your device.
      </Text>
      <Box h={8} />

      <Box width="80%" height="50%" rounded="md" border="solid 1px">
        <Scrollbars
          style={{
            width: '100%',
            height: '100%',
          }}
          autoHide
        >
          {Object.keys(Array.from({ length: 50 })).map(accountIndex => (
            <Box
              key={accountIndex}
              opacity={existing[accountIndex] && 0.7}
              width="80%"
              my={4}
              display="flex"
              alignItems="center"
            >
              <Box ml={6} fontWeight="bold">
                {' '}
                Account {Number.parseInt(accountIndex) + 1}{' '}
                {accountIndex == 0 && ' - Default'}
              </Box>
              <Checkbox
                isDisabled={existing[accountIndex]}
                isChecked={selected[accountIndex] && !existing[accountIndex]}
                onChange={(
                  event: Readonly<React.ChangeEvent<HTMLInputElement>>,
                ): void => {
                  setSelected(currentState => ({
                    ...currentState,
                    [accountIndex]: event.target.checked,
                  }));
                }}
                ml="auto"
              />
            </Box>
          ))}
        </Scrollbars>
      </Box>
      <Button
        isDisabled={
          isLoading ||
          Object.keys(selected).filter(
            currentState => selected[currentState] && !existing[currentState],
          ).length <= 0
        }
        isLoading={isLoading}
        mt="auto"
        rightIcon={<ChevronRightIcon />}
        onClick={handleSelectAccount}
      >
        Continue
      </Button>
      {error && (
        <Text mt={3} fontSize="xs" color="red.300">
          {error}
        </Text>
      )}
      <TrezorWidget ref={trezorReference} />
    </>
  );
};
