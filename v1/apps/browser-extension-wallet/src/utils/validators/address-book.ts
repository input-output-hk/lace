import i18n, { TFunction } from 'i18next';
import { Wallet } from '@lace/cardano';
import { ValidationResult } from '@types';
import { AddressBookSchema } from '@lib/storage';
import { AddressRecordParams } from '@src/features/address-book/context';
import { logger, ToastProps } from '@lace/common';
import { addressErrorMessage, nameErrorMessage } from '@lib/storage/helpers';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import ErrorIcon from '@assets/icons/address-error-icon.component.svg';
import { Cardano, HandleProvider, HandleResolution, Asset } from '@cardano-sdk/core';
import { isHandle } from '@lace/core';

const MAX_ADDRESS_BOOK_NAME_LENGTH = 20;

const hasWhiteSpace = (s: string) => s.trim() !== s;

export const verifyHandle = async (
  value: string,
  handleResolver: HandleProvider
): Promise<ValidationResult & { handles?: HandleResolution[] }> => {
  try {
    const resolvedHandles = await handleResolver.resolveHandles({ handles: [value.slice(1).toLowerCase()] });
    if (!resolvedHandles[0]) {
      return { valid: false };
    }
    return { valid: true, handles: resolvedHandles };
  } catch (error) {
    return {
      valid: false,
      message: `Error occurred during handle verification: ${error}`
    };
  }
};

type customErrorProps = {
  message: string;
  expectedAddress: Cardano.PaymentAddress;
  actualAddress: Cardano.PaymentAddress;
};
export class CustomConflictError extends Error {
  expectedAddress: Cardano.PaymentAddress;
  actualAddress: Cardano.PaymentAddress;

  constructor({ message, expectedAddress, actualAddress }: customErrorProps) {
    super(message);
    this.expectedAddress = expectedAddress;
    this.actualAddress = actualAddress;
    Object.setPrototypeOf(this, CustomConflictError.prototype);
  }
}

export class CustomError extends Error {
  constructor(message: string, public readonly isValidHandle: boolean = true) {
    super(message);
    this.name = 'CustomError';
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const isValidAddress = (address: string): boolean => {
  let isValid;
  try {
    isValid = Wallet.Cardano.isAddress(address);
  } catch (error) {
    logger.error(error.message);
    isValid = false;
  }
  return isValid;
};

export const validateWalletName = (value: string): string => {
  if (!value) return `${i18n.t('browserView.addressBook.form.nameMissing')}`;
  if (hasWhiteSpace(value)) return `${i18n.t('browserView.addressBook.form.nameHasWhiteSpace')}`;
  if (value.length > MAX_ADDRESS_BOOK_NAME_LENGTH) {
    return i18n.t('browserView.addressBook.form.nameIsTooLong', { maxLength: MAX_ADDRESS_BOOK_NAME_LENGTH });
  }
  return '';
};

export const validateWalletAddress = (address: string): string => {
  if (!address) return i18n.t('browserView.addressBook.form.addressMissing');
  if (hasWhiteSpace(address)) return i18n.t('browserView.addressBook.form.addressHasWhiteSpace');
  const isValid = isValidAddress(address);
  return !isValid ? i18n.t('browserView.addressBook.form.invalidCardanoAddress') : '';
};

type validateWalletHandleArgs = {
  value: string;
  handleResolver?: HandleProvider;
};

export const validateWalletHandle = async ({ value, handleResolver }: validateWalletHandleArgs): Promise<string> => {
  if (!Asset.util.isValidHandle(value.slice(1).toLowerCase())) {
    throw new Error(i18n.t('general.errors.invalidHandle'));
  }

  const response = await verifyHandle(value, handleResolver);

  if (!response.valid) {
    throw new Error(i18n.t('general.errors.incorrectHandle'));
  }
  return '';
};

type ensureHandleOwnerHasntChangedArgs = {
  force?: boolean;
  handleResolution: HandleResolution;
  handleResolver: HandleProvider;
};

export const ensureHandleOwnerHasntChanged = async ({
  force,
  handleResolution,
  handleResolver
}: ensureHandleOwnerHasntChangedArgs): Promise<void> => {
  if (Cardano.isAddress(handleResolution.handle)) {
    return;
  }

  const { handle, cardanoAddress } = handleResolution;
  const resolvedHandle = await handleResolver.resolveHandles({ force, handles: [handle] });

  if (!resolvedHandle[0]) {
    throw new CustomError(i18n.t('general.errors.incorrectHandle'), false);
  }

  if (!Cardano.util.addressesShareAnyKey(cardanoAddress, resolvedHandle[0].cardanoAddress)) {
    throw new CustomConflictError({
      message: `${i18n.t('general.errors.handleConflict', {
        receivedAddress: cardanoAddress,
        actualAddress: resolvedHandle[0].cardanoAddress
      })}`,
      expectedAddress: cardanoAddress,
      actualAddress: resolvedHandle[0].cardanoAddress
    });
  }
};

// popup view specific validations
export const validateAddressBookName = (value: string, translateFn: TFunction): ValidationResult =>
  value.length > MAX_ADDRESS_BOOK_NAME_LENGTH
    ? {
        valid: false,
        message: translateFn('addressBook.errors.nameTooLong', { maxLength: MAX_ADDRESS_BOOK_NAME_LENGTH })
      }
    : { valid: true };

export const validateMainnetAddress = (address: string): boolean =>
  // is Shelley era mainnet address
  address.startsWith('addr1') ||
  // is Byron era mainnet Icarus-style address
  address.startsWith('Ae2') ||
  // is Byron era mainnet Daedalus-style address
  address.startsWith('DdzFF') ||
  // address is a handle
  isHandle(address);

export const validateTestnetAddress = (address: string): boolean =>
  address.startsWith('addr_test') ||
  isHandle(address) ||
  (!validateMainnetAddress(address) && Wallet.Cardano.Address.isValidByron(address));

export const validateAddrPerNetwork: Record<Wallet.Cardano.NetworkId, (address: string) => boolean> = {
  [Wallet.Cardano.NetworkId.Mainnet]: (address: string) => validateMainnetAddress(address),
  [Wallet.Cardano.NetworkId.Testnet]: (address: string) => validateTestnetAddress(address)
};

export const isValidAddressPerNetwork = ({
  address,
  network
}: {
  address: string;
  network: Wallet.Cardano.NetworkId;
}): boolean => !address || validateAddrPerNetwork[network](address);

export const hasAddressBookItem = (
  list: AddressBookSchema[],
  record: AddressRecordParams
): [boolean, ToastProps | undefined] => {
  const toastParams = { duration: TOAST_DEFAULT_DURATION, icon: ErrorIcon };
  if (list.some((item) => item.name === record.name))
    return [
      true,
      {
        text: i18n.t(nameErrorMessage),
        ...toastParams
      }
    ];

  if (list.some((item) => item.address === record.address))
    return [
      true,
      {
        text: i18n.t(addressErrorMessage),
        ...toastParams
      }
    ];

  return [false, undefined];
};

type addressToSaveArgs = {
  address: AddressBookSchema | Omit<AddressBookSchema, 'id'> | Omit<AddressBookSchema, 'id' | 'network'>;
  handleResolver: HandleProvider;
};
export const getAddressToSave = async ({
  address,
  handleResolver
}: addressToSaveArgs): Promise<
  AddressBookSchema | Omit<AddressBookSchema, 'id'> | Omit<AddressBookSchema, 'id' | 'network'>
> => {
  if (isHandle(address.address)) {
    const result = await verifyHandle(address.address, handleResolver);
    if (result.valid) {
      return { ...address, handleResolution: result.handles[0] };
    }
  }

  return address;
};
