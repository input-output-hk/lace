import { CardanoTxOut } from '@src/types';
import { getTransactionAssetsId } from '../activity-detail-slice';

describe('Testing activity detail slice', () => {
  test('testing getTransactionAssetsId', () => {
    const outputs = [
      {
        value: {
          assets: new Map([
            ['id1', 'val1'],
            ['id2', 'val2']
          ])
        }
      },
      {
        value: {
          assets: new Map([
            ['id1', 'val3'],
            ['id3', 'val4']
          ])
        }
      },
      {
        value: {
          assets: new Map([])
        }
      }
    ];
    expect(getTransactionAssetsId(outputs as unknown as CardanoTxOut[])).toEqual(['id1', 'id2', 'id3']);
  });
});
