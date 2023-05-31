/* eslint-disable no-magic-numbers */
import { Typography } from 'antd';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import cn from 'classnames';
import { DestinationAddressInput, DestinationAddressInputProps, getInputLabel } from '@lace/core';
import { useAddressState, useCurrentRow, useSections } from '../../store';
import { useGetFilteredAddressBook } from '@src/features/address-book/hooks';
import { useAddressBookStore } from '@src/features/address-book/store';
import { validateWalletName, validateWalletAddress, isValidAddressPerNetwork } from '@src/utils/validators';
import { Sections } from '../..';
import { sectionsConfig } from '../../constants';
import styles from './AddressInput.module.scss';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { Banner } from '@components/Banner';

const TEMP_ADDRESS = 'tempAddress';

const { Text } = Typography;

interface AddressInputProps {
  row: string;
  currentNetwork: Wallet.Cardano.NetworkId;
  isPopupView: boolean;
}

export type inputValue = string | { name: string; address: string };

const isWalletNameValid = (name: string) => !validateWalletName(name);
const isWalletAddressValid = (address: string) => !validateWalletAddress(address);
const getTempAddress = () => localStorage.getItem(TEMP_ADDRESS);

export const AddressInput = ({ row, currentNetwork, isPopupView }: AddressInputProps): React.ReactElement => {
  const { t } = useTranslation();
  const [addressInputValue, setAddressInputValue] = useState<inputValue>('');
  const MAX_ADDRESSES = isPopupView ? 3 : 5;

  const { setSection } = useSections();
  const { address, setAddressValue } = useAddressState(row);

  const { filteredAddresses, getAddressBookByNameOrAddress } = useGetFilteredAddressBook();
  const { setAddressToEdit } = useAddressBookStore();
  const [, setRowId] = useCurrentRow();

  const getExistingAddress = useCallback(
    (addr: string) => filteredAddresses?.find(({ walletAddress }) => walletAddress === addr),
    [filteredAddresses]
  );

  const destinationAddressInputTranslations = {
    recipientAddress: t('core.destinationAddressInput.recipientAddress')
  };

  const clearInput = useCallback(() => {
    setAddressInputValue('');
    setAddressValue(row, '');
  }, [setAddressInputValue, setAddressValue, row]);

  const handleInputChange: DestinationAddressInputProps['onChange'] = (value?: string) => {
    setAddressInputValue(value);
    setAddressValue(row, value);
  };

  useEffect(() => {
    getAddressBookByNameOrAddress({ value: address || '' });
  }, [address, getAddressBookByNameOrAddress]);

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
    const existingAddress = getExistingAddress(address);
    if (existingAddress) {
      setAddressInputValue({ name: existingAddress.walletName, address: existingAddress.walletAddress });
    } else {
      setAddressInputValue(address);
    }
  }, [address, getExistingAddress]);

  const addressList = useMemo(
    () =>
      filteredAddresses?.slice(0, MAX_ADDRESSES)?.map(({ walletAddress, walletName }) => ({
        value: walletAddress,
        label: getInputLabel(walletName, walletAddress)
      })),
    [MAX_ADDRESSES, filteredAddresses]
  );

  const onClick = () => {
    const existingAddress = getExistingAddress(address);
    let section = Sections.ADDRESS_LIST;

    if (existingAddress) {
      clearInput();
      return;
    }

    if (!existingAddress && isAddressInputValueValid) {
      setAddressToEdit({ name: '', address });
      section = Sections.ADDRESS_FORM;
    }
    setRowId(row);
    setSection(sectionsConfig[section]);
  };

  useEffect(() => {
    const tempAddress = getTempAddress();
    if (!tempAddress) return;
    setAddressInputValue(tempAddress);
    setAddressValue(row, tempAddress);
  }, [row, setAddressValue]);

  return (
    <span className={styles.container}>
      <DestinationAddressInput
        onClick={onClick}
        value={addressInputValue}
        options={addressList}
        onChange={handleInputChange}
        empty={!address}
        valid={isAddressInputValueValid}
        validationObject={validationObject}
        exists={!!getExistingAddress(address)}
        className={styles.input}
        style={{ width: '100%' }}
        open
        translations={destinationAddressInputTranslations}
        data-testid="address-input"
      />
      {!isAddressInputValueValid && address && (
        <Text className={styles.errorParagraph} data-testid="address-input-error">
          {t('general.errors.incorrectAddress')}
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
