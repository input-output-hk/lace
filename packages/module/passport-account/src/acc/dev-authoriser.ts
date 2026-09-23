import { createJubjubAuthoriser } from './jubjub-authoriser';
import { JubjubDevice } from './signer';

import type { PassportAuthoriser } from '@lace-contract/passport';

/**
 * A PassportAuthoriser over an in-memory JubjubDevice, for development and
 * tests. Production authorisers keep the scalar behind a passkey ceremony;
 * this one holds it directly, generating a fresh one when none is given.
 * It exposes no storage key, so account records persist unsealed with it,
 * and no key session, because nothing prompts the user: callers run each
 * flow directly.
 */
export const devJubjubAuthoriser = (scalar?: bigint): PassportAuthoriser => {
  const device =
    scalar === undefined ? JubjubDevice.generate() : new JubjubDevice(scalar);

  return createJubjubAuthoriser(async operation => operation(device));
};
