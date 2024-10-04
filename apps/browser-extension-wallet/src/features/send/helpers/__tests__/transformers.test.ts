import { availableCoinsTransformer, displayedCoinsTransformer } from '../transformers';
import { mockAvailableBalance, mockDisplayedCoins } from '../../../../utils/mocks/test-helpers';
import { TxMinimumCoinQuantity } from '../../../../types';
import { firstValueFrom } from 'rxjs';

const assetId = '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41';
const minimumCoinQuantity: TxMinimumCoinQuantity = {
  coinMissing: '2000000',
  minimumCoin: '2500000'
};

describe('Testing availableCoinsTransformer function', () => {
  it('should return parsed available coins', async () => {
    const { coins: totalCoins, assets } = await firstValueFrom(mockAvailableBalance.utxo.total$);
    const coins = availableCoinsTransformer(totalCoins.toString(), assets);
    expect(coins).toEqual([
      {
        balance: '10',
        id: '1',
        symbol: 'ADA'
      },
      {
        id: assetId,
        balance: '1000000',
        symbol: '659f2917...534c41'
      }
    ]);
  });
});

describe('Testing displayedCoinsTransformer function', () => {
  it('should return only coins field if no assets are displayed', () => {
    const result = displayedCoinsTransformer(mockDisplayedCoins);
    expect(result.coins.toString()).toBe('0');
  });

  it('should return coins and assets fields when both are displayed', () => {
    const result = displayedCoinsTransformer([...mockDisplayedCoins, { amount: '5', coinId: assetId }]);
    expect(result.coins.toString()).toBe('0');
    expect(result.assets).toEqual(new Map([[assetId, BigInt('5')]]));
  });

  it(
    'should return default minimum coin quantity as coins ' +
      'if displayed coins list only has assets and no minimum is provided',
    () => {
      const result = displayedCoinsTransformer([{ amount: '5', coinId: assetId }]);
      expect(result.coins.toString()).toBe('1000000');
      expect(result.assets).toEqual(new Map([[assetId, BigInt('5')]]));
    }
  );

  it('should return provided minimum coin quantity as coins if displayed coins list only has assets', () => {
    const result = displayedCoinsTransformer([{ amount: '5', coinId: assetId }], minimumCoinQuantity);
    expect(result.coins.toString()).toBe('2500000');
    expect(result.assets).toEqual(new Map([[assetId, BigInt('5')]]));
  });
});
