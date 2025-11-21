/* eslint-disable no-magic-numbers */
import {
  clearTemporaryTxDataFromStorage,
  getTemporaryTxDataFromStorage,
  saveTemporaryTxDataInStorage,
  getTokensProperty
} from '../helpers';
import { TemporaryTransactionDataKeys, OutputList } from '../types';
import { Wallet } from '@lace/cardano';
import { mockAssetMetadata as mockAssetBasicMetadata } from '@src/utils/mocks/test-helpers';

describe('send-transaction helpers', () => {
  let localStorageSetSpy: jest.SpyInstance;
  let localStorageRemoveSpy: jest.SpyInstance;
  let localStorageGetSpy: jest.SpyInstance;

  beforeAll(() => {
    localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');
    localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem');
    localStorageGetSpy = jest.spyOn(Storage.prototype, 'getItem');
  });

  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('saveTemporaryTxDataInStorage', () => {
    test('saves all parameters to local storage', () => {
      saveTemporaryTxDataInStorage({ tempAddress: 'address', tempOutputs: [], tempSource: 'popup' });
      expect(localStorageSetSpy).toHaveBeenCalledTimes(3);
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS, '[]');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
    });
    test('saves to local storage only the parameters that are defined', () => {
      saveTemporaryTxDataInStorage({ tempAddress: 'address', tempSource: 'popup' });
      expect(localStorageSetSpy).toHaveBeenCalledTimes(2);
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      expect(localStorageSetSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
      assertCalledWithArg(localStorageSetSpy, TemporaryTransactionDataKeys.TEMP_OUTPUTS, 0, true);
    });
  });

  describe('getTemporaryTxDataFromStorage', () => {
    test('gets the temporary transaction data from the local storage', () => {
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_OUTPUTS, '[{ "id": 1 }]');
      localStorage.setItem(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
      const data = getTemporaryTxDataFromStorage();

      expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
      expect(data.tempAddress).toEqual('address');
      expect(data.tempOutputs).toEqual([{ id: 1 }]);
      expect(data.tempSource).toEqual('popup');
    });

    describe('missing data', () => {
      test('returns null for any data that is missing', () => {
        localStorage.setItem(TemporaryTransactionDataKeys.TEMP_ADDRESS, 'address');
        localStorage.setItem(TemporaryTransactionDataKeys.TEMP_SOURCE, 'popup');
        const data = getTemporaryTxDataFromStorage();

        expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
        expect(data.tempAddress).toEqual('address');
        expect(data.tempOutputs).toBeNull();
        expect(data.tempSource).toEqual('popup');
      });
      test('returns null for all if all are missing', () => {
        const data = getTemporaryTxDataFromStorage();

        expect(localStorageGetSpy).toHaveBeenCalledTimes(3);
        expect(data.tempAddress).toBeNull();
        expect(data.tempOutputs).toBeNull();
        expect(data.tempSource).toBeNull();
      });
    });
  });

  describe('clearTemporaryTxDataFromStorage', () => {
    test('clears all data if no arguments are provided', () => {
      clearTemporaryTxDataFromStorage();
      expect(localStorageRemoveSpy).toHaveBeenCalledTimes(3);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE);
    });

    test('clears only the data for the indicated keys', () => {
      clearTemporaryTxDataFromStorage([
        TemporaryTransactionDataKeys.TEMP_ADDRESS,
        TemporaryTransactionDataKeys.TEMP_OUTPUTS
      ]);
      expect(localStorageRemoveSpy).toHaveBeenCalledTimes(2);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_ADDRESS);
      expect(localStorageRemoveSpy).toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_OUTPUTS);
      expect(localStorageRemoveSpy).not.toHaveBeenCalledWith(TemporaryTransactionDataKeys.TEMP_SOURCE);
    });
  });

  describe('getTokensProperty', () => {
    const cardanoCoinMock = {
      id: '1',
      symbol: 'ADA',
      name: 'Cardano',
      decimals: 6
    };

    const nftMetadata: Wallet.Asset.NftMetadata = {
      name: 'test-nft',
      version: '1',
      image: Wallet.Asset.Uri('ipfs://c8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe')
    };
    const tokenMetadata: Wallet.Asset.TokenMetadata = {
      assetId: Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
      name: 'Test-token',
      ticker: 'TTOKEN'
    };
    const mockNFTMetadata: Wallet.Asset.AssetInfo = {
      ...mockAssetBasicMetadata,
      supply: BigInt('1'),
      nftMetadata,
      fingerprint: Wallet.Cardano.AssetFingerprint('asset1cvmyrfrc7lpht2hcjwr9lulzyyjv27uxh3kcz0'),
      assetId: Wallet.Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e')
    };
    const mockTokenMetadata: Wallet.Asset.AssetInfo = { ...mockAssetBasicMetadata, tokenMetadata };

    const assetsInfo = new Map([
      [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), mockTokenMetadata],
      [
        Wallet.Cardano.AssetId('b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e'),
        mockNFTMetadata
      ]
    ]);

    test('one output transaction with cardano coin, should return an array of length 1', () => {
      const outputs: OutputList = {
        '1': {
          address: ' addr_test...',
          assets: [
            {
              id: cardanoCoinMock.id,
              value: '100'
            }
          ]
        }
      };

      const result = getTokensProperty(outputs, assetsInfo, cardanoCoinMock);
      expect(result).toHaveLength(1);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: cardanoCoinMock.id,
            name: cardanoCoinMock.name,
            ticker: cardanoCoinMock.symbol,
            amount: outputs['1'].assets[0].value
          })
        ])
      );
    });

    test('one output transaction with cardano coin, NFT and token should return an array of length 3', () => {
      const outputs: OutputList = {
        '1': {
          address: ' addr_test...',
          assets: [
            {
              id: cardanoCoinMock.id,
              value: '100'
            },
            {
              id: mockTokenMetadata.assetId.toString(),
              value: '500'
            },
            {
              id: mockNFTMetadata.assetId.toString(),
              value: '1'
            }
          ]
        }
      };

      const result = getTokensProperty(outputs, assetsInfo, cardanoCoinMock);
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: cardanoCoinMock.id,
            name: cardanoCoinMock.name,
            ticker: cardanoCoinMock.symbol,
            amount: outputs['1'].assets[0].value
          }),
          expect.objectContaining({
            id: mockTokenMetadata.fingerprint.toString(),
            name: mockTokenMetadata.tokenMetadata.name,
            ticker: mockTokenMetadata.tokenMetadata.ticker,
            amount: outputs['1'].assets[1].value
          }),
          expect.objectContaining({
            id: mockNFTMetadata.fingerprint.toString(),
            name: mockNFTMetadata.nftMetadata.name,
            amount: outputs['1'].assets[2].value,
            ticker: undefined
          })
        ])
      );
    });

    test('two output transaction with cardano coin and same token in each output should return an array of length 2 that sums the amount of each repeated asset', () => {
      const outputs: OutputList = {
        '1': {
          address: ' addr_test...',
          assets: [
            {
              id: cardanoCoinMock.id,
              value: '100'
            },
            {
              id: mockTokenMetadata.assetId.toString(),
              value: '500'
            }
          ]
        },
        '2': {
          address: ' addr_test...',
          assets: [
            {
              id: cardanoCoinMock.id,
              value: '100'
            },
            {
              id: mockTokenMetadata.assetId.toString(),
              value: '500'
            }
          ]
        }
      };

      const result = getTokensProperty(outputs, assetsInfo, cardanoCoinMock);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: cardanoCoinMock.id,
            name: cardanoCoinMock.name,
            ticker: cardanoCoinMock.symbol,
            amount: (Number(outputs['1'].assets[0].value) + Number(outputs['2'].assets[0].value)).toString()
          }),
          expect.objectContaining({
            id: mockTokenMetadata.fingerprint.toString(),
            name: mockTokenMetadata.tokenMetadata.name,
            ticker: mockTokenMetadata.tokenMetadata.ticker,
            amount: (Number(outputs['1'].assets[1].value) + Number(outputs['2'].assets[1].value)).toString()
          })
        ])
      );
    });

    test('if the token has no metadata should return ticker and name undefined', () => {
      const outputs: OutputList = {
        '1': {
          address: ' addr_test...',
          assets: [
            {
              id: mockTokenMetadata.assetId.toString(),
              value: '500'
            }
          ]
        }
      };

      const info = new Map([
        [
          Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
          { ...mockTokenMetadata, tokenMetadata: undefined }
        ]
      ]);

      const result = getTokensProperty(outputs, info, cardanoCoinMock);
      expect(result).toHaveLength(1);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockTokenMetadata.fingerprint.toString(),
            name: undefined,
            ticker: undefined,
            amount: outputs['1'].assets[0].value
          })
        ])
      );
    });
  });
});
