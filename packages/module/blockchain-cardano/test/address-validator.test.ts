import { Cardano } from '@cardano-sdk/core';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { None, Some } from '@lace-sdk/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as addressValidator from '../src/address-validator';

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

describe('createAddressValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValid.mockReturnValue(false);
    mockFromString.mockReturnValue(null);
  });

  describe('valid addresses', () => {
    it('should return None for valid mainnet address', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Mainnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      const validator = addressValidator.createAddressValidator();
      createTestScheduler().run(({ expectObservable, flush }) => {
        expectObservable(
          validator.validateAddress({
            address: 'addr1qxy...',
            blockchainSpecificSendFlowData: {},
            network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
          }),
        ).toBe('(a|)', { a: None });
        flush();

        expect(mockIsValid).toHaveBeenCalledWith('addr1qxy...');
        expect(mockFromString).toHaveBeenCalledWith('addr1qxy...');
        expect(mockAddress.getNetworkId).toHaveBeenCalled();
      });
    });

    it('should return None for valid testnet address', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Testnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      const validator = addressValidator.createAddressValidator();
      createTestScheduler().run(({ expectObservable, flush }) => {
        expectObservable(
          validator.validateAddress({
            address: 'addr_test...',
            blockchainSpecificSendFlowData: {},
            network: CardanoNetworkId(Cardano.NetworkMagics.Preprod),
          }),
        ).toBe('(a|)', { a: None });
        flush();

        expect(mockIsValid).toHaveBeenCalledWith('addr_test...');
        expect(mockFromString).toHaveBeenCalledWith('addr_test...');
        expect(mockAddress.getNetworkId).toHaveBeenCalled();
      });
    });
  });

  describe('invalid addresses', () => {
    it('should return Some with error for ADA handle', () => {
      const validator = addressValidator.createAddressValidator();
      createTestScheduler().run(({ expectObservable, flush }) => {
        expectObservable(
          validator.validateAddress({
            address: '$handle',
            blockchainSpecificSendFlowData: {},
            network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
          }),
        ).toBe('(a|)', { a: Some('invalid') });
        flush();

        expect(mockIsValid).toHaveBeenCalledWith('$handle');
      });
    });

    it('should return Some with error for invalid address', () => {
      const validator = addressValidator.createAddressValidator();
      createTestScheduler().run(({ expectObservable, flush }) => {
        expectObservable(
          validator.validateAddress({
            address: 'invalid',
            blockchainSpecificSendFlowData: {},
            network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
          }),
        ).toBe('(a|)', { a: Some('invalid') });
        flush();

        expect(mockIsValid).toHaveBeenCalledWith('invalid');
      });
    });

    it('should return Some with error when address is valid but wrong network', () => {
      mockIsValid.mockReturnValue(true);
      const mockAddress = {
        getNetworkId: vi.fn().mockReturnValue(Cardano.NetworkId.Testnet),
      };
      mockFromString.mockReturnValue(mockAddress);
      const validator = addressValidator.createAddressValidator();
      createTestScheduler().run(({ expectObservable, flush }) => {
        expectObservable(
          validator.validateAddress({
            address: 'addr_test...',
            blockchainSpecificSendFlowData: {},
            network: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
          }),
        ).toBe('(a|)', { a: Some('invalid') });
        flush();

        expect(mockIsValid).toHaveBeenCalledWith('addr_test...');
        expect(mockFromString).toHaveBeenCalledWith('addr_test...');
        expect(mockAddress.getNetworkId).toHaveBeenCalled();
      });
    });
  });

  it('should have correct blockchainName', () => {
    const validator = addressValidator.createAddressValidator();
    expect(validator.blockchainName).toBe('Cardano');
  });
});
