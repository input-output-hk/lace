import { Serialization } from '@lace-lib/cardano-core';
import { HexBlob } from '@lace-lib/util/common';

import { util } from '../../src';

import type { AsyncKeyAgent, Witnesser } from '../../src';
import type { Cardano } from '@lace-lib/cardano-core';
import type { Cip30DataSignature } from '@lace-lib/cardano-dapp-connector';
import type { Mocked } from 'vitest';

describe('createBip32Ed25519Witnesser', () => {
  let asyncKeyAgent: Mocked<AsyncKeyAgent>;
  let witnesser: Witnesser;

  beforeEach(async () => {
    asyncKeyAgent = {
      signBlob: vi.fn(),
      signCip8Data: vi.fn(),
      signTransaction: vi.fn(),
    } as unknown as Mocked<AsyncKeyAgent>;
    witnesser = util.createBip32Ed25519Witnesser(asyncKeyAgent);
  });

  it('signData is unchanged', async () => {
    const blob = HexBlob('abc123');
    const result = {} as Cip30DataSignature;
    const props = {
      knownAddresses: [],
      payload: blob,
      sender: { url: 'some test' },
      signWith: 'stub' as Cardano.PaymentAddress,
    };
    asyncKeyAgent.signCip8Data.mockResolvedValueOnce(result);
    await expect(witnesser.signData(props)).resolves.toBe(result);
    expect(asyncKeyAgent.signCip8Data).toBeCalledWith(props);
  });

  it('signTransaction is unchanged', async () => {
    const transaction = new Serialization.Transaction(
      Serialization.TransactionBody.fromCore({
        fee: 20_000n,
        inputs: [],
        outputs: [],
        validityInterval: {},
      }),
      new Serialization.TransactionWitnessSet(),
    );

    const options = { knownAddresses: [], txInKeyPathMap: {} };
    const result = new Map();
    asyncKeyAgent.signTransaction.mockResolvedValueOnce(result);

    const witnessTx = await witnesser.witness(transaction, options);
    await expect(witnessTx.tx.witness).toEqual({ signatures: result });
    expect(asyncKeyAgent.signTransaction).toBeCalledWith(
      transaction.body(),
      options,
      void 0,
    );
  });
});
