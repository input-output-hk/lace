import { util } from '@cardano-sdk/key-management';

import type { Cardano } from '@cardano-sdk/core';
import type {
  AccountKeyDerivationPath,
  GroupedAddress,
  TxInKeyPathMap,
} from '@cardano-sdk/key-management';

const pathKey = ({ role, index }: AccountKeyDerivationPath) =>
  `${role}.${index}`;

/**
 * Own derivation paths a transaction requires solely through its native
 * scripts: paths signature detection reports once the witness scripts are
 * considered, minus those already required by inputs, certificates,
 * withdrawals, required extra signatures, or voting procedures.
 *
 * Signers whose device protocol cannot request extra script witnesses use the
 * result to fail fast instead of returning an incompletely witnessed
 * transaction.
 *
 * The DRep key hash is deliberately omitted from both detection passes:
 * passing it to only one would skew the comparison, and script key hashes are
 * only ever matched against payment and stake credentials, never the DRep key.
 */
export const getScriptOnlyKeyPaths = ({
  txBody,
  knownAddresses,
  txInKeyPathMap,
  scripts,
}: {
  txBody: Cardano.TxBody;
  knownAddresses: GroupedAddress[];
  txInKeyPathMap: TxInKeyPathMap;
  scripts: Cardano.Script[] | undefined;
}): AccountKeyDerivationPath[] => {
  const pathsWithScripts = util.ownSignatureKeyPaths(
    txBody,
    knownAddresses,
    txInKeyPathMap,
    undefined,
    scripts,
  );
  const pathsWithoutScripts = new Set(
    util
      .ownSignatureKeyPaths(txBody, knownAddresses, txInKeyPathMap)
      .map(pathKey),
  );
  return pathsWithScripts.filter(
    path => !pathsWithoutScripts.has(pathKey(path)),
  );
};
