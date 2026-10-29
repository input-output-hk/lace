import { Cardano } from '@lace-lib/cardano-core';

import { AddressType, KeyRole, TxInId, util } from '../../src';

import type { GroupedAddress } from '../../src';

describe('createTxInKeyPathMap', () => {
  const ownAddress = Cardano.PaymentAddress(
    'addr_test1qqydn46r6mhge0kfpqmt36m6q43knzsd9ga32n96m89px3nuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qypp3m9',
  );
  const foreignAddress = Cardano.PaymentAddress(
    'addr_test1qra788mu4sg8kwd93ns9nfdh3k4ufxwg4xhz2r3n064tzfgxu2hyfhlkwuxupa9d5085eunq2qywy7hvmvej456flkns6cy45x',
  );
  const knownAddresses = [
    {
      accountIndex: 0,
      address: ownAddress,
      index: 3,
      networkId: Cardano.NetworkId.Testnet,
      type: AddressType.Internal,
    } as GroupedAddress,
  ];
  const txIn = (index: number): Cardano.TxIn => ({
    index,
    txId: Cardano.TransactionId(
      '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5',
    ),
  });
  const resolvedAddress = new Map<number, Cardano.PaymentAddress>([
    [0, ownAddress],
    [1, foreignAddress],
    [3, ownAddress],
  ]);
  const inputResolver: Cardano.InputResolver = {
    resolveInput: async input => {
      const address = resolvedAddress.get(input.index);
      return address ? { address, value: { coins: 1n } } : null;
    },
  };

  it('maps own inputs and collaterals to their key paths and skips the rest', async () => {
    const body = {
      collaterals: [txIn(3)],
      inputs: [txIn(0), txIn(1), txIn(2)],
    } as Cardano.TxBody;

    const map = await util.createTxInKeyPathMap(
      body,
      knownAddresses,
      inputResolver,
    );

    expect(map).toEqual({
      [TxInId(txIn(0))]: { index: 3, role: KeyRole.Internal },
      [TxInId(txIn(3))]: { index: 3, role: KeyRole.Internal },
    });
  });
});
