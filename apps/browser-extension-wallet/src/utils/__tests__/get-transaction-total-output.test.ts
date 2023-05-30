import { Wallet } from '@lace/cardano';
import '@testing-library/jest-dom';
import { CardanoTxOut } from '../../types';
import { getTransactionTotalOutput } from '../get-transaction-total-output';

const outputs: CardanoTxOut[] = [
  {
    address: Wallet.Cardano.PaymentAddress(
      'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
    ),
    value: {
      coins: BigInt('396'),
      assets: new Map([
        [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('3000000')]
      ])
    }
  },
  {
    address: Wallet.Cardano.PaymentAddress(
      'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
    ),
    value: {
      coins: BigInt('200'),
      assets: new Map([
        [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('100')]
      ])
    }
  },
  {
    address: Wallet.Cardano.PaymentAddress(
      'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
    ),
    value: {
      coins: BigInt('450'),
      assets: new Map([
        [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('150')]
      ])
    }
  }
];

describe('Testing getTransactionTotalOutput function', () => {
  test('should return total output', async () => {
    const result = getTransactionTotalOutput(outputs);

    expect(result.toString()).toBe('1046');
  });
});
