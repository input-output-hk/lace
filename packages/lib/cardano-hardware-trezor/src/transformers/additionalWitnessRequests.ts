import { util } from '@lace-lib/cardano-key-management';
import { isNotNil } from '@lace-lib/util/common';
import isArray from 'lodash/isArray.js';
import uniq from 'lodash/uniq.js';

import { resolvePaymentKeyPathForTxIn } from './keyPaths';

import type { TrezorTxTransformerContext } from '../types';
import type { Cardano } from '@lace-lib/cardano-core';
import type { Transform } from '@lace-lib/util/common';
import type * as Trezor from '@trezor/connect';

export const mapAdditionalWitnessRequests: Transform<
  Cardano.TxIn[],
  Trezor.DerivationPath[],
  TrezorTxTransformerContext
> = (inputs, context) => {
  const paymentKeyPaths = uniq<Trezor.DerivationPath>(
    inputs
      .map(input => resolvePaymentKeyPathForTxIn(input, context))
      .filter(isNotNil)
      .filter(isArray),
  );

  const additionalWitnessPaths: Trezor.DerivationPath[] = [...paymentKeyPaths];

  if (context?.knownAddresses?.length) {
    const stakeKeyPath = util.stakeKeyPathFromGroupedAddress(
      context.knownAddresses[0],
    );
    if (stakeKeyPath) additionalWitnessPaths.push(stakeKeyPath);
  }
  return additionalWitnessPaths;
};
