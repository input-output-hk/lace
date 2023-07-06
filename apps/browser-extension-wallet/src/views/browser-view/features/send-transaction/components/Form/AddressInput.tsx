/* eslint-disable complexity */
/* eslint-disable unicorn/no-useless-undefined */
import { Typography } from 'antd';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import cn from 'classnames';
import { DestinationAddressInput, getInputLabel, isHandle, HANDLE_DEBOUNCE_TIME } from '@lace/core';
import { useAddressState, useCurrentRow, useSections } from '../../store';
import { useGetFilteredAddressBook } from '@src/features/address-book/hooks';
import { useAddressBookStore } from '@src/features/address-book/store';
import {
  validateWalletName,
  validateWalletAddress,
  isValidAddressPerNetwork,
  verifyHandle
} from '@src/utils/validators';
import { Sections } from '../..';
import { sectionsConfig } from '../../constants';
import styles from './AddressInput.module.scss';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { Banner } from '@lace/common';
import { useHandleResolver } from '@hooks/useHandleResolver';
import debounce from 'lodash/debounce';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';

const TEMP_ADDRESS = 'tempAddress';

const { Text } = Typography;

interface AddressInputProps {
  row: string;
  currentNetwork: Wallet.Cardano.NetworkId;
  isPopupView: boolean;
}

export type inputValue = { name?: string; address: string };

const isWalletNameValid = (name: string) => !validateWalletName(name);
const isWalletAddressValid = (address: string) => !validateWalletAddress(address);
const getTempAddress = () => localStorage.getItem(TEMP_ADDRESS);

enum HandleVerificationState {
  VALID = 'valid',
  INVALID = 'invalid',
  VERIFYING = 'verifying'
}

export const AddressInput = ({ row, currentNetwork, isPopupView }: AddressInputProps): React.ReactElement => {
  const { t } = useTranslation();
  const handleResolver = useHandleResolver();
  const [addressInputValue, setAddressInputValue] = useState<inputValue>({ address: '' });
  // eslint-disable-next-line no-magic-numbers
  const MAX_ADDRESSES = isPopupView ? 3 : 5;

  const { setSection } = useSections();
  const { address, handle, setAddressValue } = useAddressState(row);
  const { filteredAddresses, getAddressBookByNameOrAddress } = useGetFilteredAddressBook();
  const { setAddressToEdit } = useAddressBookStore();
  const [, setRowId] = useCurrentRow();
  const [handleVerificationState, setHandleVerificationState] = useState<HandleVerificationState | undefined>();

  const getExistingAddress = useCallback(
    (addr: string) => filteredAddresses?.find(({ walletAddress }) => walletAddress === addr),
    [filteredAddresses]
  );

  const destinationAddressInputTranslations = {
    recipientAddress: t('core.destinationAddressInput.recipientAddress')
  };

  const isAddressInputValueHandle = isAdaHandleEnabled && isHandle(addressInputValue.address.toString());

  const clearInput = useCallback(() => {
    setAddressInputValue({ address: '' });
    setAddressValue(row, '');
    setHandleVerificationState(undefined);
  }, [setAddressInputValue, setAddressValue, setHandleVerificationState, row]);

  const handleInputChange = (value?: string) => {
    setAddressInputValue({ address: value });
    setAddressValue(row, value);

    if (value.length === 0) {
      setHandleVerificationState(undefined);
    }
  };

  const resolveHandle = useMemo(
    () =>
      debounce(async () => {
        if (handle) {
          setHandleVerificationState(HandleVerificationState.VALID);
          return;
        }

        const handleString = addressInputValue.address.toString();

        const { handles, valid } = await verifyHandle(handleString, handleResolver);
        if (!valid) {
          setHandleVerificationState(HandleVerificationState.INVALID);
        } else {
          setHandleVerificationState(HandleVerificationState.VALID);
          setAddressValue(row, handles[0].cardanoAddress.toString(), handleString);
        }
      }, HANDLE_DEBOUNCE_TIME),
    [handle, setHandleVerificationState, addressInputValue, handleResolver, setAddressValue, row]
  );

  useEffect(() => {
    if (!address) {
      return;
    }

    if (isAddressInputValueHandle) {
      setHandleVerificationState(HandleVerificationState.VERIFYING);
      resolveHandle();
    } else {
      setHandleVerificationState(undefined);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      resolveHandle && resolveHandle.cancel();
    };
  }, [address, addressInputValue, setHandleVerificationState, resolveHandle, isAddressInputValueHandle]);

  useEffect(() => {
    getAddressBookByNameOrAddress({ value: handle || address || '' });
  }, [address, getAddressBookByNameOrAddress, handle]);

  const validationObject = useMemo(() => {
    const isNameValid = address && isWalletNameValid(address);
    const isAddressValid = isWalletAddressValid(address);
    return {
      name: isNameValid,
      address: isAddressValid,
      isValidAddressPerNetwork:
        !isAddressValid ||
        isValidAddressPerNetwork({
          address,
          network: currentNetwork
        })
    };
  }, [address, currentNetwork]);

  const isAddressInputValueValid = validationObject.name || validationObject.address;

  useEffect(() => {
    const existingAddress = getExistingAddress(handle || address);
    if (existingAddress) {
      setAddressInputValue({ name: existingAddress.walletName, address: existingAddress.walletAddress });
    } else {
      setAddressInputValue({ address: handle || address });
    }
  }, [address, handle, getExistingAddress]);

  const addressList = useMemo(
    () =>
      filteredAddresses?.slice(0, MAX_ADDRESSES)?.map(({ walletAddress, walletName }) => ({
        value: walletAddress,
        label: getInputLabel(walletName, walletAddress)
      })),
    [MAX_ADDRESSES, filteredAddresses]
  );

  const onClick = () => {
    const existingAddress = getExistingAddress(handle || address);
    let section = Sections.ADDRESS_LIST;

    if (existingAddress) {
      clearInput();
      return;
    }

    if (!existingAddress && isAddressInputValueValid) {
      setAddressToEdit({ name: '', address: handle || address });
      section = Sections.ADDRESS_FORM;
    }
    setRowId(row);
    setSection(sectionsConfig[section]);
  };

  useEffect(() => {
    const tempAddress = getTempAddress();
    if (!tempAddress) return;
    setAddressInputValue({ address: tempAddress });
    setAddressValue(row, tempAddress);
  }, [row, setAddressValue]);

  return (
    <span className={styles.container}>
      <DestinationAddressInput
        onClick={onClick}
        value={addressInputValue}
        options={addressList}
        handle={handleVerificationState}
        onChange={handleInputChange}
        empty={!address}
        valid={isAddressInputValueValid}
        validationObject={validationObject}
        exists={!!getExistingAddress(handle || address)}
        className={styles.input}
        style={{ width: '100%' }}
        open
        translations={destinationAddressInputTranslations}
        data-testid="address-input"
      />
      {!isAddressInputValueValid && !isAddressInputValueHandle && address && (
        <Text className={styles.errorParagraph} data-testid="address-input-error">
          {t('general.errors.incorrectAddress')}
        </Text>
      )}
      {isAddressInputValueHandle && handleVerificationState === HandleVerificationState.INVALID && (
        <Text className={styles.errorParagraph} data-testid="handle-input-error">
          {t('general.errors.incorrectHandle')}
        </Text>
      )}
      {address && !validationObject.isValidAddressPerNetwork && (
        <Banner
          className={cn(styles.banner, { [styles.popupView]: isPopupView })}
          message={t('general.errors.wrongNetworkAddress')}
          withIcon
        />
      )}
    </span>
  );
};
