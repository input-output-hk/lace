/* eslint-disable @typescript-eslint/no-floating-promises */
import type { ReactElement } from 'react';
import React, { useCallback, useMemo } from 'react';

import { WalletType } from '@cardano-sdk/web-extension';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box, Button, Checkbox, Text } from '@chakra-ui/react';
import { Wallet } from '@lace/cardano';

import { Events } from '../../../features/analytics/events';
import { useCaptureEvent } from '../../../features/analytics/hooks';
import { useOutsideHandles } from '../../../features/outside-handles-provider/useOutsideHandles';
import { Scrollbars } from '../components/scrollbar';
import TrezorWidget from '../components/TrezorWidget';

import type { UseAccount } from '../../../adapters/account';

const accountsIndexes = Object.keys(Array.from({ length: 50 }));
const defaultAccountName = (accountIndex: number) => `Account #${accountIndex}`;

interface SelectAccountsProps {
  connection: Wallet.HardwareWalletConnection;
  onConfirm: () => void;
  accounts: UseAccount['allAccounts'];
  activateAccount: UseAccount['activateAccount'];
}

export const SelectAccounts = ({
  connection,
  onConfirm,
  accounts,
  activateAccount,
}: Readonly<SelectAccountsProps>): ReactElement | null => {
  const capture = useCaptureEvent();
  const {
    createHardwareWalletRevamped,
    saveHardwareWallet,
    environmentName,
    walletRepository,
  } = useOutsideHandles();

  const existingAccountsIndexes = useMemo(
    () =>
      new Set(
        accounts?.filter(a => a.type === connection.type).map(a => a.index),
      ),
    [accounts, connection],
  );
  const walletId = useMemo(
    () => accounts?.find(a => a.type === connection.type)?.walletId,
    [accounts],
  );

  const [selected, setSelected] = React.useState({ 0: true });
  const [error, setError] = React.useState('');
  const trezorReference = React.useRef();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSelectAccount = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    const accountIndexes = Object.keys(selected)
      .filter(
        currentState =>
          selected[currentState] && !isAccountDisabled(currentState),
      )
      .map(Number);
    // enable more accounts for existing hw
    if (walletId && existingAccountsIndexes.size > 0) {
      for (const accountIndex of accountIndexes) {
        try {
          await walletRepository.addAccount({
            accountIndex,
            extendedAccountPublicKey:
              await Wallet.getHwExtendedAccountPublicKey(
                connection.type,
                accountIndex,
                connection.type === WalletType.Ledger
                  ? connection.value
                  : undefined,
              ),
            metadata: {
              name: defaultAccountName(accountIndex),
              namiMode: { avatar: Math.random().toString() },
            },
            walletId,
          });
        } catch (error: unknown) {
          throw error;
        }
      }
      await activateAccount({ accountIndex: accountIndexes[0], walletId });
    } else {
      // create new hw
      let cardanoWallet: Wallet.CardanoWallet;
      try {
        cardanoWallet = await createHardwareWalletRevamped({
          connection,
          name: 'Wallet 1',
          accountIndexes,
        });
        await saveHardwareWallet(cardanoWallet, environmentName);
      } catch (error_) {
        console.log(error_);
        setError('An error occured');
      }
    }
    onConfirm();
    void capture(Events.HWSelectAccountNextClick, {
      numAccounts: accountIndexes.length,
    });
    setIsLoading(false);
  };

  const isAccountDisabled = useCallback(
    (index: string) => existingAccountsIndexes.has(Number(index)),
    [existingAccountsIndexes],
  );

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
          {accountsIndexes.map(accountIndex => (
            <Box
              opacity={isAccountDisabled(accountIndex) ? 0.7 : 1}
              key={accountIndex}
              width="80%"
              my={4}
              display="flex"
              alignItems="center"
            >
              <Box ml={6} fontWeight="bold">
                {' '}
                Account {accountIndex} {accountIndex === '0' && ' - Default'}
              </Box>
              <Checkbox
                isDisabled={isAccountDisabled(accountIndex)}
                isChecked={
                  selected[accountIndex] && !isAccountDisabled(accountIndex)
                }
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
            currentState =>
              selected[currentState] && !isAccountDisabled(currentState),
          ).length <= 0
        }
        isLoading={isLoading}
        mt="auto"
        rightIcon={<ChevronRightIcon />}
        onClick={() => {
          void handleSelectAccount();
        }}
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
