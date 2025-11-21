/* eslint-disable max-statements */
/* eslint-disable complexity, sonarjs/cognitive-complexity */
/* eslint-disable unicorn/no-useless-undefined */
import { Typography } from 'antd';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import cn from 'classnames';
import { DestinationAddressInput, getInputLabel, isHandle, HANDLE_DEBOUNCE_TIME } from '@lace/core';
import { useAddressState, useCurrentRow, useSections } from '../../store';
import {
  CustomError,
  CustomConflictError,
  validateWalletName,
  validateWalletAddress,
  isValidAddressPerNetwork,
  ensureHandleOwnerHasntChanged,
  verifyHandle
} from '@src/utils/validators';
import { useGetFilteredAddressBook } from '@src/features/address-book/hooks';
import { useAddressBookStore } from '@src/features/address-book/store';
import { Sections } from '../..';
import { sectionsConfig } from '../../constants';
import styles from './AddressInput.module.scss';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { Banner } from '@lace/common';
import { useHandleResolver } from '@hooks/useHandleResolver';
import debounce from 'lodash/debounce';
import { getTemporaryTxDataFromStorage } from '../../helpers';
import { Asset, HandleResolution } from '@cardano-sdk/core';
import ExclamationCircleOutline from '@src/assets/icons/red-exclamation-circle.component.svg';
import { isAdaHandleEnabled } from '@src/features/ada-handle/config';

const { Text } = Typography;

interface AddressInputProps {
  row: string;
  currentNetwork: Wallet.Cardano.NetworkId;
  isPopupView: boolean;
}

export type inputValue = { name?: string; address: string; handleResolution?: HandleResolution };

const isWalletNameValid = (name: string) => !validateWalletName(name);
const isWalletAddressValid = (address: string) => !validateWalletAddress(address);

export enum HandleVerificationState {
  VALID = 'valid',
  INVALID = 'invalid',
  VERIFYING = 'verifying',
  CHANGED_OWNERSHIP = 'changedOwnership'
}

export const AddressInput = ({ row, currentNetwork, isPopupView }: AddressInputProps): React.ReactElement => {
  const { t } = useTranslation();
  const handleResolver = useHandleResolver();
  const [addressInputValue, setAddressInputValue] = useState<inputValue>({ address: '' });
  // eslint-disable-next-line no-magic-numbers
  const MAX_ADDRESSES = isPopupView ? 3 : 5;

  const { setSection } = useSections();
  const { address, handle, handleStatus, setAddressValue } = useAddressState(row);
  const { filteredAddresses, filterAddressesByNameOrAddress } = useGetFilteredAddressBook();
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

  const isAddressInputInvalidHandle =
    isAdaHandleEnabled &&
    isHandle(addressInputValue.address.toString()) &&
    !Asset.util.isValidHandle(addressInputValue.address.toString().slice(1).toLowerCase());

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
        setHandleVerificationState(HandleVerificationState.VERIFYING);

        if (isAddressInputInvalidHandle) {
          setHandleVerificationState(HandleVerificationState.INVALID);
        }
        if (!addressInputValue.handleResolution) {
          const { valid, handles } = await verifyHandle(addressInputValue.address, handleResolver);

          if (valid) {
            setHandleVerificationState(HandleVerificationState.VALID);
          } else {
            setHandleVerificationState(HandleVerificationState.INVALID);
          }
          const cardanoAddress = handles?.length > 0 ? handles[0].cardanoAddress : '';
          setAddressValue(row, cardanoAddress, addressInputValue.address, { isVerified: true });
          return;
        }

        try {
          await ensureHandleOwnerHasntChanged({
            force: true,
            handleResolution: addressInputValue?.handleResolution,
            handleResolver
          });

          setHandleVerificationState(HandleVerificationState.VALID);
          setAddressValue(row, addressInputValue?.handleResolution.cardanoAddress, addressInputValue.address, {
            hasHandleOwnershipChanged: false,
            isVerified: true
          });
        } catch (error) {
          if (error instanceof CustomError && error.isValidHandle === false) {
            setHandleVerificationState(HandleVerificationState.INVALID);
            setAddressValue(row, addressInputValue?.handleResolution.cardanoAddress, addressInputValue.address, {
              isVerified: true
            });
          }
          if (error instanceof CustomConflictError) {
            setHandleVerificationState(HandleVerificationState.CHANGED_OWNERSHIP);
            setAddressValue(row, addressInputValue?.handleResolution.cardanoAddress, addressInputValue.address, {
              hasHandleOwnershipChanged: true,
              isVerified: true
            });
          }
        }
      }, HANDLE_DEBOUNCE_TIME),
    [
      addressInputValue.address,
      addressInputValue.handleResolution,
      handleResolver,
      isAddressInputInvalidHandle,
      row,
      setAddressValue
    ]
  );

  useEffect(() => {
    if (!address) {
      return;
    }

    if (handleStatus.isVerified === true) {
      if (handleStatus.hasHandleOwnershipChanged) {
        setHandleVerificationState(HandleVerificationState.CHANGED_OWNERSHIP);
      } else {
        setHandleVerificationState(HandleVerificationState.VALID);
      }

      return;
    }

    if (isAddressInputValueHandle) {
      resolveHandle();
    } else {
      setHandleVerificationState(undefined);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      resolveHandle && resolveHandle.cancel();
    };
  }, [
    address,
    addressInputValue,
    setHandleVerificationState,
    resolveHandle,
    isAddressInputValueHandle,
    handleStatus.isVerified,
    handleStatus.hasHandleOwnershipChanged
  ]);

  useEffect(() => {
    filterAddressesByNameOrAddress({ value: handle || address || '' });
  }, [address, filterAddressesByNameOrAddress, handle]);

  const validationObject = useMemo(() => {
    const isNameValid = address && isWalletNameValid(address);
    const isAddressValid = !isHandle(address) && isWalletAddressValid(address);
    return {
      name: isNameValid,
      address: isAddressValid,
      isHandleOwnershipValid: handleVerificationState === HandleVerificationState.VALID,
      isValidAddressPerNetwork:
        !isAddressValid ||
        isValidAddressPerNetwork({
          address,
          network: currentNetwork
        })
    };
  }, [address, currentNetwork, handleVerificationState]);

  const isAddressInputValueValid = validationObject.name || validationObject.address;

  useEffect(() => {
    // todo: debounce this
    const existingAddress = getExistingAddress(handle || address);
    if (existingAddress) {
      setAddressInputValue({
        name: existingAddress.walletName,
        address: existingAddress.walletAddress,
        handleResolution: existingAddress.walletHandleResolution || undefined
      });
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

  const handleAddressReview = () => {
    setAddressToEdit({
      name: addressInputValue.name,
      address: handle,
      handleResolution: addressInputValue.handleResolution
    });
    setSection({ currentSection: Sections.ADDRESS_CHANGE, prevSection: Sections.FORM });
    setAddressValue(row, address, handle, {
      hasHandleOwnershipChanged: false,
      isVerified: false
    });
  };

  useEffect(() => {
    const { tempAddress } = getTemporaryTxDataFromStorage();
    if (!tempAddress) return;
    setAddressInputValue({ address: tempAddress });
    setAddressValue(row, tempAddress);
  }, [row, setAddressValue]);

  const bannerDescription =
    isPopupView && isAdaHandleEnabled
      ? 'addressBook.reviewModal.banner.popUpDescription'
      : 'addressBook.reviewModal.banner.browserDescription';

  const getButtonText = !isPopupView && t('addressBook.reviewModal.banner.confirmReview.button');
  const getLinkMessage = isPopupView && t('addressBook.reviewModal.banner.confirmReview.link');
  const getMessagePartTwo = isPopupView && t('addressBook.reviewModal.banner.popUpDescriptionEnd');

  const setInvalidMessage = isAddressInputInvalidHandle
    ? 'general.errors.invalidHandle'
    : 'general.errors.incorrectHandle';

  const isStatusInvalid =
    (isAddressInputValueHandle || isAddressInputInvalidHandle) &&
    handleVerificationState === HandleVerificationState.INVALID;

  const exists = () => {
    if (handleVerificationState === HandleVerificationState.VALID) {
      return Boolean(getExistingAddress(handle));
    }

    if (address.startsWith('$')) {
      return false;
    }

    return Boolean(getExistingAddress(address));
  };

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
        exists={exists()}
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
      {isStatusInvalid && (
        <Text className={styles.errorParagraph} data-testid="handle-input-error">
          {t(`${setInvalidMessage}`)}
        </Text>
      )}
      {address && !validationObject.isValidAddressPerNetwork && (
        <Banner
          className={cn(styles.banner, { [styles.popupView]: isPopupView })}
          message={t('general.errors.wrongNetworkAddress')}
          withIcon
        />
      )}
      {handleVerificationState && handleVerificationState === HandleVerificationState.CHANGED_OWNERSHIP && (
        <Banner
          withIcon
          customIcon={<ExclamationCircleOutline />}
          onButtonClick={handleAddressReview}
          popupView={isPopupView}
          message={t(bannerDescription, { name: addressInputValue.name })}
          messagePartTwo={isAdaHandleEnabled && getMessagePartTwo}
          buttonMessage={isAdaHandleEnabled && getButtonText}
          linkMessage={isAdaHandleEnabled && getLinkMessage}
        />
      )}
    </span>
  );
};
