import { WrongScriptTypeError } from './errors';

import type { DecodedHdKey } from './crypto-hdkey';

/**
 * Asserts that a decoded export is single-sig native-segwit (BIP-84). A bare
 * crypto-hdkey is single-sig by definition; multisig is rejected earlier at
 * crypto-account/crypto-output decode time. Throws {@link WrongScriptTypeError}
 * when the script type is not native-segwit.
 */
export const assertSingleSigNativeSegwit = (decoded: DecodedHdKey): void => {
  if (decoded.scriptType !== 'NativeSegWit') {
    throw new WrongScriptTypeError();
  }
};
