import { GrantSlot, TokenColor } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';

import {
  circuitScope,
  deriveGrantId,
  granteePoint,
  grantObjectCommit,
  originHash,
} from '../../src/acc/grants';

import type { JubjubDevice } from '../../src/acc/signer';
import type { StoredGrant } from '../../src/flows/types';
import type { GrantGrantee, GrantRecord } from '@lace-contract/passport';

type IssuedGrantProps = {
  address: string;
  origin: string;
  /** A jubjub device, or a grantee named by its scheme and key. */
  grantee: GrantGrantee | JubjubDevice;
  slot: number;
  scopeSalt?: string;
  /** The grantee's read public key, for a grant that reads. */
  readPublicKey?: string;
};

/**
 * A grant issued to `grantee` at `slot` under `origin`, with commitments
 * computed the way the contract computes them, so the bookkeeping opens
 * them exactly when its fields are the ones the grant was issued with.
 */
export const issuedGrant = async ({
  address,
  origin,
  grantee,
  slot,
  scopeSalt = '07'.repeat(32),
  readPublicKey,
}: IssuedGrantProps) => {
  const named: GrantGrantee =
    'scheme' in grantee
      ? grantee
      : {
          scheme: 'jubjub-schnorr',
          publicKey: HexBytes.fromByteArray(
            jubjub.Point.fromAffine(grantee.pk).toBytes(),
          ),
        };
  const { scheme: granteeScheme, publicKey: granteePublicKey } = named;
  const id = deriveGrantId({
    contractAddress: ByteArray.fromHex(HexBytes(address)),
    granteePublicKey: granteePoint(named),
    originHash: await originHash(origin),
    slot: GrantSlot(slot),
  });
  const object = {
    color: '00'.repeat(32),
    recipient: { kind: 'any' as const },
    maxCoinValue: '300',
  };
  const encoded = circuitScope({
    grantee: named,
    operations: [],
    color: TokenColor(object.color),
    recipient: object.recipient,
    maxCoinValue: object.maxCoinValue,
    perCallCap: '0',
    cap: '0',
    expiresAt: null,
    ...(readPublicKey === undefined ? {} : { readPublicKey }),
  });
  const onChain = (active = true): GrantRecord => ({
    id,
    slot: GrantSlot(slot),
    active,
    epoch: 0,
    generation: 0,
    issuedAt: 1,
    scope: {
      operations: ['withdraw-unshielded'],
      read: readPublicKey !== undefined,
      objectCommit: grantObjectCommit(
        ByteArray.fromHex(HexBytes(scopeSalt)),
        encoded,
      ),
      perCallCap: '300',
      cap: '450',
      expiresAt: null,
      rpCommit: '00'.repeat(32),
      readPkHash: HexBytes.fromByteArray(encoded.readPkHash),
      window: null,
      callerCommit: '00'.repeat(32),
    },
    spentWindow: { start: 0, spent: '0' },
  });
  const stored: StoredGrant = {
    slot,
    scopeSalt,
    granteeScheme,
    granteePublicKey,
    origin,
    object,
    ...(readPublicKey === undefined ? {} : { view: { readPublicKey } }),
  };
  return {
    id,
    stored,
    onChain,
    opening: {
      scopeSalt,
      granteeScheme,
      granteePublicKey,
      origin,
      color: TokenColor(object.color),
      recipient: object.recipient,
      maxCoinValue: object.maxCoinValue,
    },
  };
};
