import { Cardano, Serialization } from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';

import { KeyRole, util } from '../../src';
import { testKeyAgent } from '../mocks';

import type { KeyAgent } from '../../src';

describe('KeyAgentTransactionSigner', () => {
  let keyAgent: KeyAgent;
  const txBody = Serialization.TransactionBody.fromCore({
    fee: 200_000n,
    inputs: [
      {
        index: 0,
        txId: Cardano.TransactionId(
          '0f3abbc8fc19c2e61bab6059bf8a466e6e754833a08a62a6c56fe0e78f19d9d5',
        ),
      },
    ],
    outputs: [],
  });

  it('signs the body hash with the given account key and returns one signature', async () => {
    keyAgent = await testKeyAgent();
    const account = { index: 0, role: KeyRole.External };
    const signer = new util.KeyAgentTransactionSigner(keyAgent, account);

    const { pubKey, signature } = await signer.sign(txBody);

    expect(pubKey).toBe(await keyAgent.derivePublicKey(account));
    const bodyHash = Crypto.blake2b.hash(txBody.toCbor(), 32);
    expect(
      keyAgent.bip32Ed25519.verify(
        signature,
        bodyHash as unknown as Parameters<
          typeof keyAgent.bip32Ed25519.verify
        >[1],
        pubKey,
      ),
    ).toBe(true);
  });
});
