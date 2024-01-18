/* eslint-disable no-magic-numbers */
import { ReplaySubject } from 'rxjs';
import { Wallet } from '@lace/cardano';
import { createHistoricalOwnInputResolver } from '../own-input-resolver';
import { getTxCollateral } from '../get-tx-collateral';

describe('getTxCollateral', () => {
  let transactionsHistory$: ReplaySubject<Wallet.Cardano.HydratedTx[]>;
  let addresses$: ReplaySubject<Wallet.KeyManagement.GroupedAddress[]>;
  let resolver: Wallet.Cardano.InputResolver;

  const totalCollateral = BigInt(10);

  const triggerInputResolver = () => {
    const mockTx = {
      id: 'foo',
      body: {
        outputs: [
          {
            address: 'addr_test1',
            value: { coins: totalCollateral }
          }
        ]
      }
    } as unknown as Wallet.Cardano.HydratedTx;

    const mockGroupedAddress = { address: 'addr_test1' } as unknown as Wallet.KeyManagement.GroupedAddress;

    transactionsHistory$.next([mockTx]);
    addresses$.next([mockGroupedAddress]);
  };

  beforeEach(() => {
    transactionsHistory$ = new ReplaySubject<Wallet.Cardano.HydratedTx[]>();
    addresses$ = new ReplaySubject<Wallet.KeyManagement.GroupedAddress[]>();
    resolver = createHistoricalOwnInputResolver({ addresses$, transactionsHistory$ });
  });

  it('returns 0 when collaterals input is missing', async () => {
    const tx = { body: {} } as unknown as Wallet.Cardano.Tx;

    const result = await getTxCollateral(tx, resolver, []);
    expect(result).toEqual(BigInt(0));
  });

  it('returns totalCollateral when it is available in the tx', async () => {
    const tx = {
      body: {
        totalCollateral,
        collaterals: [{}]
      }
    } as unknown as Wallet.Cardano.Tx;

    const result = await getTxCollateral(tx, resolver, []);
    expect(result).toEqual(totalCollateral);
  });

  it('returns 0 when the collaterals input is unresolved', async () => {
    const tx = {
      body: {
        collaterals: [
          {
            txId: 'foo',
            index: 0
          }
        ]
      }
    } as unknown as Wallet.Cardano.Tx;

    transactionsHistory$.next([]);
    addresses$.next([]);

    const result = await getTxCollateral(tx, resolver, []);
    expect(result).toEqual(BigInt(0));
  });

  it('returns the diff between collaterals and collateralReturn', async () => {
    const tx = {
      body: {
        collaterals: [
          {
            txId: 'foo',
            index: 0
          }
        ],
        collateralReturn: {
          address: 'addr_test1',
          value: {
            coins: BigInt(8)
          }
        }
      }
    } as unknown as Wallet.Cardano.Tx;

    triggerInputResolver();

    const result = await getTxCollateral(tx, resolver, ['addr_test1' as Wallet.Cardano.PaymentAddress]);
    expect(result).toEqual(BigInt(2));
  });

  it('returns the sum of all collaterals input when the collateralReturn is an external address', async () => {
    const tx = {
      body: {
        collaterals: [
          {
            txId: 'foo',
            index: 0
          }
        ],
        collateralReturn: {
          address: 'external_address',
          value: {
            coins: BigInt(8)
          }
        }
      }
    } as unknown as Wallet.Cardano.Tx;

    triggerInputResolver();

    const result = await getTxCollateral(tx, resolver, ['addr_test1' as Wallet.Cardano.PaymentAddress]);
    expect(result).toEqual(totalCollateral);
  });

  it('should return the sum of all collaterals output when the collateral return property is not present', async () => {
    const tx = {
      body: {
        collaterals: [
          {
            txId: 'foo',
            index: 0
          }
        ]
      }
    } as unknown as Wallet.Cardano.Tx;

    triggerInputResolver();

    const result = await getTxCollateral(tx, resolver, ['addr_test1' as Wallet.Cardano.PaymentAddress]);
    expect(result).toEqual(totalCollateral);
  });
});
