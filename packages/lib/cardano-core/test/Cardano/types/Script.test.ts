import { HexBlob } from '@lace-lib/util/common';

import * as Cardano from '../../../src/Cardano';

describe('Cardano/types/Script', () => {
  const plutus: Cardano.PlutusScript = {
    __type: Cardano.ScriptType.Plutus,
    bytes: HexBlob('4e4d01000033222220051200120011'),
    version: Cardano.PlutusLanguageVersion.V2,
  };
  const native: Cardano.NativeScript = {
    __type: Cardano.ScriptType.Native,
    kind: Cardano.NativeScriptKind.RequireTimeBefore,
    slot: Cardano.Slot(1000),
  };

  it('isPlutusScript and isNativeScript discriminate on the script type', () => {
    expect(Cardano.isPlutusScript(plutus)).toBe(true);
    expect(Cardano.isPlutusScript(native)).toBe(false);
    expect(Cardano.isNativeScript(native)).toBe(true);
    expect(Cardano.isNativeScript(plutus)).toBe(false);
  });
});
