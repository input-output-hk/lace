import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { BlockchainNetworkId } from '@lace-contract/network';
import { None, Some } from '@lace-sdk/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as addressValidator from '../src/validate-address';

const { mockIsValid, mockFromString } = vi.hoisted(() => ({
  mockIsValid: vi.fn().mockReturnValue(false),
  mockFromString: vi.fn().mockReturnValue(null),
}));

vi.mock('@cardano-sdk/core', async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { Cardano } = await vi.importActual<typeof import('@cardano-sdk/core')>(
    '@cardano-sdk/core',
  );
  return {
    Cardano: {
      Address: {
        isValid: mockIsValid,
        fromString: mockFromString,
      },
      NetworkId: Cardano.NetworkId,
      ChainIds: Cardano.ChainIds,
      NetworkMagics: Cardano.NetworkMagics,
    },
  };
});

describe('validateAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValid.mockReturnValue(false);
    mockFromString.mockReturnValue(null);
  });

  describe('valid addresses', () => {
    it('should return true for valid Cardano mainnet address', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Mainnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      expect(
        addressValidator.validateAddress({
          address: 'addr1qxy...',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toBe(None);
      expect(mockIsValid).toHaveBeenCalledWith('addr1qxy...');
      expect(mockFromString).toHaveBeenCalledWith('addr1qxy...');
      expect(mockAddress.getNetworkId).toHaveBeenCalled();
    });

    it('should return true for valid Cardano testnet address', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Testnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      expect(
        addressValidator.validateAddress({
          address: 'addr_test...',
          network: CardanoNetworkId(Cardano.NetworkMagics.Preprod),
        }),
      ).toBe(None);
      expect(mockIsValid).toHaveBeenCalledWith('addr_test...');
      expect(mockFromString).toHaveBeenCalledWith('addr_test...');
      expect(mockAddress.getNetworkId).toHaveBeenCalled();
    });
  });

  describe('invalid addresses', () => {
    it('should return error for ADA handle', () => {
      expect(
        addressValidator.validateAddress({
          address: '$handle',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toStrictEqual(Some(addressValidator.invalidAddressError));
    });

    it('should return error when network is not recognized', () => {
      expect(
        addressValidator.validateAddress({
          address: 'addr1qxy...',
          network: BlockchainNetworkId('midnight-mainnet'),
        }),
      ).toStrictEqual(Some(addressValidator.unknownNetworkError));
    });

    it('should return false when Cardano address is invalid', () => {
      expect(
        addressValidator.validateAddress({
          address: 'invalid',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toStrictEqual(Some(addressValidator.invalidAddressError));
      expect(mockIsValid).toHaveBeenCalledWith('invalid');
    });

    it('should return false when Cardano address is valid but wrong network', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Testnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      expect(
        addressValidator.validateAddress({
          address: 'addr_test...',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toStrictEqual(Some(addressValidator.invalidAddressError));
      expect(mockIsValid).toHaveBeenCalledWith('addr_test...');
      expect(mockFromString).toHaveBeenCalledWith('addr_test...');
      expect(mockAddress.getNetworkId).toHaveBeenCalled();
    });

    it('should return false when Cardano address is valid but fromString returns null', () => {
      mockIsValid.mockReturnValue(true);
      mockFromString.mockReturnValue(null);
      expect(
        addressValidator.validateAddress({
          address: 'addr1qxy...',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toStrictEqual(Some(addressValidator.invalidAddressError));
      expect(mockIsValid).toHaveBeenCalledWith('addr1qxy...');
      expect(mockFromString).toHaveBeenCalledWith('addr1qxy...');
    });

    it('should return false for empty string', () => {
      expect(
        addressValidator.validateAddress({
          address: '',
          network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        }),
      ).toStrictEqual(Some(addressValidator.invalidAddressError));
      expect(mockIsValid).toHaveBeenCalledWith('');
    });
  });
});
