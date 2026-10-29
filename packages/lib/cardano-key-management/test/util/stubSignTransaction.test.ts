import {
  Ed25519PublicKey,
  Ed25519PublicKeyHex,
  ready,
} from '@lace-lib/cardano-crypto';

import { util } from '../../src';
import { ownSignatureKeyPaths as ownSignatureKeyPathsModule } from '../../src/util/ownSignatureKeyPaths';

import type { GroupedAddress } from '../../src';
import type { Cardano } from '@lace-lib/cardano-core';

vi.mock('../../src/util/ownSignatureKeyPaths');
const ownSignatureKeyPaths = vi.mocked(ownSignatureKeyPathsModule);

describe('KeyManagement.util.stubSignTransaction', async () => {
  beforeAll(async () => {
    await ready();
  });

  it('returns as many signatures as number of keys returned by ownSignaturePaths', async () => {
    const txBody = {} as Cardano.HydratedTxBody;
    const knownAddresses = [{} as GroupedAddress];
    const dRepPublicKey = Ed25519PublicKeyHex(
      '0b1c96fad4179d7910bd9485ac28c4c11368c83d18d01b29d4cf84d8ff6a06c4',
    );
    const dRepKeyHash = Ed25519PublicKey.fromHex(dRepPublicKey).hash().hex();
    const txInKeyPathMap = {};
    // The stub only counts the paths.
    type Paths = ReturnType<typeof ownSignatureKeyPathsModule>;
    ownSignatureKeyPaths
      .mockReturnValueOnce(['a'] as unknown as Paths)
      .mockReturnValueOnce(['a', 'b'] as unknown as Paths);
    expect(
      (
        await util.stubSignTransaction({
          context: {
            dRepKeyHashHex: dRepKeyHash,
            knownAddresses,
            txInKeyPathMap,
          },
          txBody,
        })
      ).size,
    ).toBe(1);
    expect(
      (
        await util.stubSignTransaction({
          context: {
            dRepKeyHashHex: dRepKeyHash,
            knownAddresses,
            txInKeyPathMap,
          },
          txBody,
        })
      ).size,
    ).toBe(2);
    const expectedArgs = [
      txBody,
      knownAddresses,
      txInKeyPathMap,
      dRepKeyHash,
      undefined,
    ] as const;
    expect(ownSignatureKeyPaths).toBeCalledWith(...expectedArgs);
  });
});
