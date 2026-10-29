import { Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import { createCardanoKeyAgentFromMnemonic } from '../../src/signing/cardano-key-agent';

const words =
  'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
    ' ',
  );

describe('mnemonic key agent lifetime', () => {
  it('signs while active and zeros the byte-array passphrase on dispose', async () => {
    const passphrase = new Uint8Array(32).fill(7);
    const random = vi
      .spyOn(crypto, 'getRandomValues')
      .mockImplementationOnce(() => passphrase);
    try {
      const agent = await createCardanoKeyAgentFromMnemonic({
        accountIndex: 0,
        chainId: Cardano.ChainIds.Preprod,
        mnemonicWords: words,
      });
      expect(
        (await agent.signBlob({ role: 0, index: 0 }, HexBlob('1234')))
          .signature,
      ).toBeTruthy();
      expect(passphrase).toEqual(new Uint8Array(32).fill(7));
      agent.dispose?.();
      expect(passphrase).toEqual(new Uint8Array(32));
    } finally {
      random.mockRestore();
    }
  });
});
