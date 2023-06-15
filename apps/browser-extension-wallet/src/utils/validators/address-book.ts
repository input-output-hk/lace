import i18n, { TFunction } from 'i18next';
import { Wallet } from '@lace/cardano';
import { ValidationResult } from '@types';
import { AddressBookSchema } from '@lib/storage';
import { AddressRecordParams } from '@src/features/address-book/context';
import { ToastProps } from '@lace/common';
import { addressErrorMessage, nameErrorMessage } from '@lib/storage/helpers';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import ErrorIcon from '@assets/icons/address-error-icon.component.svg';

const MAX_ADDRESS_BOOK_NAME_LENGTH = 20;

// prettier-ignore
const hasWhiteSpace = (s: string) => s.trim() !== s;

export const isValidAddress = (address: string): boolean => {
  let isValid;
  try {
    isValid = Wallet.Cardano.isAddress(address);
  } catch (error) {
    console.log(error.message);
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
  return !isValid ? i18n.t('browserView.addressBook.form.incorrectCardanoAddress') : '';
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
  address.startsWith('DdzFF');

export const validateTestnetAddress = (address: string): boolean =>
  address.startsWith('addr_test') || (!validateMainnetAddress(address) && Wallet.Cardano.Address.isValidByron(address));

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
