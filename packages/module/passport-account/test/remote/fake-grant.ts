import { AccAddress, TokenColor } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { jubjub } from '@noble/curves/misc.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';

import {
  issueGrantBinding,
  originHash,
  prepareIssueGrant,
} from '../../src/acc/grants';
import { JubjubDevice } from '../../src/acc/signer';
import { encodeBytes } from '../../src/remote/codec';

import type {
  GrantId,
  GrantRecord,
  GrantScopeInput,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';

export const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
export const ACCOUNT = AccAddress(HexBytes.fromByteArray(CONTRACT_ADDRESS));

const grantee = new JubjubDevice(55n);

/** The compressed form a consumer supplies the grantee key in. */
export const GRANTEE_PUBLIC_KEY = HexBytes.fromByteArray(
  jubjub.Point.fromAffine(grantee.pk).toBytes(),
);

/** A scope the contract issues today: one unshielded withdrawal, capped. */
export const spendScope: GrantScopeInput = {
  grantee: { scheme: 'jubjub-schnorr', publicKey: GRANTEE_PUBLIC_KEY },
  operations: ['withdraw-unshielded'],
  color: TokenColor('00'.repeat(32)),
  recipient: { kind: 'any' },
  maxCoinValue: '300',
  perCallCap: '300',
  cap: '450',
  expiresAt: null,
};

/** The fixed secret of a secp256k1 ECDSA grantee, as a wallet account holds it. */
export const K256_GRANTEE_SECRET = 0x5eed_c0ffeen;

/** The 33-byte SEC1 compressed form a secp256k1 grantee key is supplied in. */
export const K256_GRANTEE_PUBLIC_KEY = HexBytes.fromByteArray(
  secp256k1.Point.BASE.multiply(K256_GRANTEE_SECRET).toBytes(true),
);

/** The spend scope issued to a secp256k1 ECDSA grantee instead. */
export const k256SpendScope: GrantScopeInput = {
  ...spendScope,
  grantee: { scheme: 'secp256k1-ecdsa', publicKey: K256_GRANTEE_PUBLIC_KEY },
};

/** RFC 7748 section 6.1, Bob's key pair: a grantee's read key for a read grant. */
export const READ_SECRET = Uint8Array.from(
  Buffer.from(
    '5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb',
    'hex',
  ),
);
export const READ_PUBLIC_KEY =
  'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f';

/** A scope that reads and withdraws shielded tokens: the viewing secret is shared. */
export const readScope: GrantScopeInput = {
  ...spendScope,
  operations: ['withdraw-unshielded', 'withdraw-shielded'],
  read: true,
  rpId: 'dapp.example',
  readPublicKey: READ_PUBLIC_KEY,
};

/**
 * An issue-grant descriptor as both ends type it: the dApp's key session
 * flow without the digest, the signer's descriptor with it.
 */
export type IssueGrantDescriptor = {
  kind: 'issue-grant';
  account: AccAddress;
  grantId: GrantId;
  scope: GrantScopeInput;
  slot: GrantSlot;
  scopeSalt: GrantScopeSalt;
  scopeDigest: string;
  devices?: string[];
};

/**
 * An issue-grant descriptor and the circuit arguments it binds, prepared
 * the way the dApp's flow prepares them for the client id `clientId`,
 * with a fixed scope salt so two preparations agree. A read grant's
 * descriptor names `devices`, the device entries its rotation may seal
 * to, none here.
 */
export const prepareIssueGrantFlow = async (
  clientId: string,
  scope: GrantScopeInput = spendScope,
  roster: GrantRecord[] = [],
): Promise<{ flow: IssueGrantDescriptor; args: readonly unknown[] }> => {
  const { grantId, slot, scopeSalt, call } = prepareIssueGrant({
    contractAddress: CONTRACT_ADDRESS,
    scope,
    originHash: await originHash(clientId),
    roster,
    randomBytes: length => new Uint8Array(length).fill(0x22),
  });
  return {
    flow: {
      kind: 'issue-grant',
      account: ACCOUNT,
      grantId,
      scope,
      slot,
      scopeSalt,
      scopeDigest: encodeBytes(issueGrantBinding(call.args).scopeDigest),
      ...(scope.read === true ? { devices: [] } : {}),
    },
    args: call.args,
  };
};
