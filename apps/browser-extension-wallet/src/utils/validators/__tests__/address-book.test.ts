import { AddressBookSchema } from '@lib/storage';

const mockIsAddress = jest.fn();
/* eslint-disable import/imports-first */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wallet } from '@lace/cardano';
import { ValidationResult } from '../../../types';
import * as addressBook from '../address-book';
import i18n from 'i18next';
import { Cardano, HandleProvider } from '@cardano-sdk/core';
import { validateWalletHandle } from '../address-book';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      Cardano: {
        ...actual.Wallet.Cardano,
        isAddress: mockIsAddress,
        util: {
          ...actual.Wallet.Cardano.util
        }
      }
    }
  };
});

describe('Testing address book validator', () => {
  let translate: jest.Mock;

  describe('Address Book Name validations', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      translate = jest.fn((arg) => arg);
    });
    test('should return valid true when name is not longer than 20 characters', () => {
      expect(addressBook.validateAddressBookName('asdsad', translate)).toEqual<ValidationResult>({ valid: true });
    });
    test('should return valid false and an error message when name is longer than 20 characters', () => {
      expect(addressBook.validateAddressBookName('123456789012345678901', translate)).toEqual<ValidationResult>({
        valid: false,
        message: 'addressBook.errors.nameTooLong'
      });
    });
  });

  describe('Addresses per networks validations', () => {
    test('should return false in case there is no address', () => {
      expect(addressBook.isValidAddressPerNetwork({ address: '', network: Wallet.Cardano.NetworkId.Mainnet })).toEqual(
        true
      );
    });
    test('should handle mainnet address validation', () => {
      const network = Wallet.Cardano.NetworkId.Mainnet;
      const address = 'address';
      const validateMainnetAddressResult = 'validateMainnetAddress';
      const spy = jest.spyOn(addressBook, 'validateMainnetAddress');
      spy.mockReturnValue(validateMainnetAddressResult as any as boolean);

      expect(addressBook.isValidAddressPerNetwork({ address, network })).toEqual(validateMainnetAddressResult);
      spy.mockRestore();
    });
    test('should handle testnet address validation', () => {
      const network = Wallet.Cardano.NetworkId.Testnet;
      const address = 'address';
      const validateTestnetAddressResult = 'validateTestnetAddress';
      const spy = jest.spyOn(addressBook, 'validateTestnetAddress');
      spy.mockReturnValue(validateTestnetAddressResult as any as boolean);

      expect(addressBook.isValidAddressPerNetwork({ address, network })).toEqual(validateTestnetAddressResult);
      spy.mockRestore();
    });
    test('validateAddrPerNetwork called proper validator for testnet', () => {
      const validateTestnetAddressResult = 'validateTestnetAddress';
      const spy = jest.spyOn(addressBook, 'validateTestnetAddress');
      spy.mockReturnValue(validateTestnetAddressResult as any as boolean);
      expect(addressBook.validateAddrPerNetwork[Wallet.Cardano.NetworkId.Testnet]('')).toEqual(
        validateTestnetAddressResult
      );
      spy.mockRestore();
    });
    test('validateAddrPerNetwork called proper validator for mainnet', () => {
      const validateTestnetAddressResult = 'validateTestnetAddress';
      const spy = jest.spyOn(addressBook, 'validateMainnetAddress');
      spy.mockReturnValue(validateTestnetAddressResult as any as boolean);
      expect(addressBook.validateAddrPerNetwork[Wallet.Cardano.NetworkId.Mainnet]('')).toEqual(
        validateTestnetAddressResult
      );
      spy.mockRestore();
    });
  });

  describe('validateWalletAddress', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(i18n, 't').mockImplementation((str: string) => str);
    });
    test('should return proper error in case there is no address', () => {
      expect(addressBook.validateWalletAddress('')).toEqual('browserView.addressBook.form.addressMissing');
    });
    test('should return proper error in case there is a white space', () => {
      expect(addressBook.validateWalletAddress(' asd')).toEqual('browserView.addressBook.form.addressHasWhiteSpace');
      expect(addressBook.validateWalletAddress('asd ')).toEqual('browserView.addressBook.form.addressHasWhiteSpace');
      expect(addressBook.validateWalletAddress(' asd ')).toEqual('browserView.addressBook.form.addressHasWhiteSpace');
    });
    test('should return proper error in case it is not valid', () => {
      const spy = jest.spyOn(addressBook, 'isValidAddress').mockImplementation(() => false);
      expect(addressBook.validateWalletAddress('asd')).toEqual('browserView.addressBook.form.incorrectCardanoAddress');
      spy.mockRestore();
    });
    test('should return an empty string in case it is valid', () => {
      const spy = jest.spyOn(addressBook, 'isValidAddress').mockImplementation(() => true);
      expect(addressBook.validateWalletAddress('asd')).toEqual('');
      spy.mockRestore();
    });
  });

  describe('isValidAddress', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('should return false in case the address is not valid', () => {
      mockIsAddress.mockReturnValue(false);
      expect(addressBook.isValidAddress('asd')).toEqual(false);
    });
    test('should return false in case it throws', () => {
      const logSpy = jest.spyOn(console, 'log');

      mockIsAddress.mockImplementation(() => {
        throw new Error('error');
      });
      expect(addressBook.isValidAddress('asd')).toEqual(false);
      expect(logSpy).toHaveBeenCalledWith('error');
    });
    test('should return true in case the address is valid', () => {
      mockIsAddress.mockReturnValue(true);
      expect(addressBook.isValidAddress('asd')).toEqual(true);
    });
  });

  describe('validateWalletName', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.spyOn(i18n, 't').mockImplementation((str: string) => str);
    });
    test('should return proper error in case there is no name', () => {
      expect(addressBook.validateWalletName('')).toEqual('browserView.addressBook.form.nameMissing');
    });
    test('should return proper error in case there is a white space', () => {
      expect(addressBook.validateWalletName(' asd')).toEqual('browserView.addressBook.form.nameHasWhiteSpace');
      expect(addressBook.validateWalletName('asd ')).toEqual('browserView.addressBook.form.nameHasWhiteSpace');
      expect(addressBook.validateWalletName(' asd ')).toEqual('browserView.addressBook.form.nameHasWhiteSpace');
    });
    test('should return proper error in case it is longer that allowed', () => {
      const length = 20;
      const name = Array.from({ length: length + 1 })
        .map(() => '1')
        .join('');
      expect(addressBook.validateWalletName(name)).toEqual('browserView.addressBook.form.nameIsTooLong');
    });
    test('should return an empty string in case it is valid', () => {
      const length = 20;
      const name = Array.from({ length })
        .map(() => '1')
        .join('');
      expect(addressBook.validateWalletName(name)).toEqual('');
    });
  });

  describe('validateMainnetAddress', () => {
    test('return true', () => {
      expect(addressBook.validateMainnetAddress('addr1')).toEqual(true);
      expect(addressBook.validateMainnetAddress('Ae2')).toEqual(true);
      expect(addressBook.validateMainnetAddress('DdzFF')).toEqual(true);
    });
    test('return false', () => {
      expect(addressBook.validateMainnetAddress('')).toEqual(false);
      expect(addressBook.validateMainnetAddress('asdf')).toEqual(false);
    });
  });

  describe('validateTestnetAddress', () => {
    test('return true', () => {
      expect(addressBook.validateTestnetAddress('addr_test')).toEqual(true);
      expect(
        addressBook.validateTestnetAddress('FHnt4NL7yPXk3XQc5eccwYXdor3fgr8gv9SGgx3gYs1qjXh74itnQmawkBek4fL')
      ).toEqual(true);
      expect(
        addressBook.validateTestnetAddress(
          'KjgoiXJS2coPC96HDdVRfms2ge8aPCvP8uWuHwjk7kY8Jwg9qS8mQMCpoeqwjjUfdCLBMByhYpD3FMHmHwpjPnqk3PLYXHAPf24kpca3JRjG'
        )
      ).toEqual(true);
    });
    test('return false', () => {
      expect(addressBook.validateTestnetAddress('')).toEqual(false);
      expect(addressBook.validateTestnetAddress('asdf')).toEqual(false);
      expect(addressBook.validateTestnetAddress('addr1')).toEqual(false);
      expect(addressBook.validateTestnetAddress('Ae2')).toEqual(false);
      expect(addressBook.validateTestnetAddress('DdzFF')).toEqual(false);
    });
  });

  describe('hasAddressBookItem', () => {
    const mockAddressList: AddressBookSchema[] = Array.from({ length: 4 }, (_v, i) => ({
      id: i + 1,
      address: `addr_test${i + 1}`,
      name: `test wallet ${i + 1}`,
      network: Cardano.NetworkMagics.Preprod
    }));

    test('has item with the same name', () => {
      expect(
        addressBook.hasAddressBookItem(mockAddressList, { name: 'test wallet 1', address: 'addr_test14' })[0]
      ).toBe(true);
    });
    test('has item with the same address', () => {
      expect(
        addressBook.hasAddressBookItem(mockAddressList, { name: 'test wallet 15', address: 'addr_test2' })[0]
      ).toBe(true);
    });
    test('does not have an item with the same name and address', () => {
      expect(
        addressBook.hasAddressBookItem(mockAddressList, { name: 'test wallet 15', address: 'addr_test15' })[0]
      ).toBe(false);
    });
  });

  describe('validateWalletHandle', () => {
    const mockHandleResolver = { resolveHandles: jest.fn(), healthCheck: jest.fn() } as HandleProvider;
    const value = 'sampleValue';

    test('should throw an error if handles are not found', async () => {
      (mockHandleResolver.resolveHandles as jest.Mock).mockReturnValue([]);

      await expect(
        async () => await validateWalletHandle({ value, handleResolver: mockHandleResolver })
      ).rejects.toThrow('general.errors.incorrectHandle');
    });

    test('should return the handle information', async () => {
      const resolvedHandles = [
        {
          cardanoAddress: Cardano.PaymentAddress(
            'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
          )
        }
      ];
      (mockHandleResolver.resolveHandles as jest.Mock).mockReturnValue(resolvedHandles);

      expect(await validateWalletHandle({ value, handleResolver: mockHandleResolver })).toBe('');
    });
  });
});
