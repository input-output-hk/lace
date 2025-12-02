import { availableCoinsTransformer } from '../transformers';
import { mockAvailableBalance } from '../../../../utils/mocks/test-helpers';
import { firstValueFrom } from 'rxjs';

const assetId = '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41';

describe('Testing availableCoinsTransformer function', () => {
  it('should return parsed available coins', async () => {
    const { coins: totalCoins, assets } = await firstValueFrom(mockAvailableBalance.utxo.total$);
    const coins = availableCoinsTransformer(totalCoins.toString(), assets);
    expect(coins).toEqual([
      {
        balance: '10.00',
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
