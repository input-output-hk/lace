import * as Crypto from '@lace-lib/cardano-crypto';
import { deepEquals } from '@lace-lib/util/common';
import getRandomValues from 'get-random-values';
import uniqWith from 'lodash/uniqWith.js';

import { ownSignatureKeyPaths } from './ownSignatureKeyPaths';

import type { SignTransactionContext, SignTransactionOptions } from '../types';
import type { Cardano } from '@lace-lib/cardano-core';

const randomPublicKey = () =>
  Crypto.Ed25519PublicKeyHex(
    Buffer.from(getRandomValues(new Uint8Array(32))).toString('hex'),
  );

export interface StubSignTransactionProps {
  txBody: Cardano.TxBody;
  context: SignTransactionContext;
  signTransactionOptions?: SignTransactionOptions;
}

export const stubSignTransaction = async ({
  txBody,
  context: {
    knownAddresses,
    txInKeyPathMap,
    dRepKeyHashHex: dRepKeyHash,
    scripts,
  },
  signTransactionOptions: { extraSigners, additionalKeyPaths = [] } = {},
}: StubSignTransactionProps): Promise<Cardano.Signatures> => {
  const mockSignature = Crypto.Ed25519SignatureHex(
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  );
  const signatureKeyPaths = uniqWith(
    [
      ...ownSignatureKeyPaths(
        txBody,
        knownAddresses,
        txInKeyPathMap,
        dRepKeyHash,
        scripts,
      ),
      ...additionalKeyPaths,
    ],
    deepEquals,
  );

  const totalSignature = signatureKeyPaths.length + (extraSigners?.length || 0);
  const signatureMap = new Map();

  for (let i = 0; i < totalSignature; ++i)
    signatureMap.set(randomPublicKey(), mockSignature);

  return signatureMap;
};
