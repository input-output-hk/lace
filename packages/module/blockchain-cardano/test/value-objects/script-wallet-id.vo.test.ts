import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import { ScriptWalletId } from '../../src';

describe('value-objects/script-wallet-id', () => {
  describe('getScriptWalletId', () => {
    it('can create unique id for scripts', () => {
      const script = Serialization.Script.fromCbor(
        HexBlob(
          '82008202828200581cb275b08c999097247f7c17e77007c7010cd19f20cc086ad99d3985388201838205190bb88200581c966e394a544f242081e41d1965137b1bb412ac230d40ed5407821c378204190fa0',
        ),
      ).toCore();

      const nativeScript: Cardano.Script = {
        __type: Cardano.ScriptType.Native,
        keyHash: Crypto.Ed25519KeyHashHex(
          'b275b08c999097247f7c17e77007c7010cd19f20cc086ad99d398538',
        ),
        kind: Cardano.NativeScriptKind.RequireSignature,
      };

      const id1 = ScriptWalletId.fromScript(script);
      const id2 = ScriptWalletId.fromScript(nativeScript);

      expect(id1).not.toEqual(id2);
    });
  });
});
