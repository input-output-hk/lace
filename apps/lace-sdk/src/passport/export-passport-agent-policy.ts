import {
  GrantNotFoundError,
  GrantOpeningUnavailableError,
  GrantRevokedError,
  NoAccountError,
} from '@lace-contract/passport';
import { firstValueFrom } from 'rxjs';

import type { StateObservables } from '@lace-contract/module';
import type {
  GrantId,
  GrantOperation,
  GrantRecipient,
  GranteeScheme,
  passportSelectors,
} from '@lace-contract/passport';

/**
 * The Passport state of a wallet with the Passport module loaded, as
 * observables: `wallet.stateObservables.passport`. The policy export reads
 * the account and the grant roster from it.
 */
export type WalletWithPassport = {
  stateObservables: StateObservables<typeof passportSelectors>;
};

/** The version of the policy this SDK writes and reads. */
export const PASSPORT_AGENT_POLICY_VERSION = 2;

/**
 * What an agent needs to act under one grant, as JSON: where the grant is
 * (network, account, grant id, slot), who it is for (the grantee key, its
 * `granteeScheme` and the relying party id `origin` its id was derived
 * from), the limits it carries, the scope salt and object fields the
 * contract keeps only as commitments and, for a read grant, `view`, the
 * account's viewing secret sealed towards the agent's read key. Integers
 * are decimal strings, keys, salts and colours are lower-case hex, and the
 * seal is base64url.
 *
 * The limits are a snapshot of the grant when it was exported. `window` is
 * always null, since the contract accepts no rolling window. `view`
 * is the 94-byte GrantViewSeal of the scoped grants standard, sealed to
 * the read key the grant was issued with; the agent opens it with its
 * read secret and must check that the X25519 public key of the secret
 * inside equals the account's `enc_key` before reading, since a rotation
 * since the export leaves it stale. A read grant's policy leaves `view`
 * out when this client holds no seal of the account's current secret
 * for it, see {@link exportPassportAgentPolicy}.
 */
export type PassportAgentPolicy = {
  type: 'passport-agent-policy';
  version: typeof PASSPORT_AGENT_POLICY_VERSION;
  /** The Midnight network id the account lives on. */
  network: string;
  /** The address of the account's Account Custody Contract. */
  account: string;
  grantId: string;
  slot: number;
  /** The signature scheme the grantee signs with, see {@link GranteeScheme}. */
  granteeScheme: GranteeScheme;
  /**
   * The grantee key as lower-case hex: 32 bytes for `jubjub-schnorr`, the
   * 33-byte compressed point for `secp256k1-ecdsa`.
   */
  granteePublicKey: string;
  scopeSalt: string;
  /** The token colour the grant may withdraw. */
  color: string;
  recipient: GrantRecipient;
  maxCoinValue: string;
  perCallCap: string;
  cap: string;
  /** POSIX seconds, or null when the grant never expires. */
  expiresAt: number | null;
  window: null;
  operations: GrantOperation[];
  /** The relying party id the grant is bound to. */
  origin: string;
  /**
   * The sealed viewing secret of a read grant, base64url; absent for a
   * grant that does not read and for a read grant whose seal is stale.
   */
  view?: string;
};

const toBase64Url = (hex: string): string =>
  btoa(
    String.fromCharCode(
      ...(hex.match(/.{2}/g) ?? []).map(pair => Number.parseInt(pair, 16)),
    ),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

/** What {@link exportPassportAgentPolicy} needs beyond the wallet. */
export type ExportPassportAgentPolicyProps = {
  /** The grant to export, from `issueGrant` or the grant roster. */
  grantId: GrantId;
};

/**
 * The agent policy of one active grant this client issued. Nothing is
 * asked of the user and nothing is sent: the policy is assembled from the
 * grant roster in the wallet's state, which carries the limits the
 * contract stores and the opening this client kept when it issued the
 * grant, and its network is the one the account in state lives on. The
 * roster is as of the last sign-in or grant call on this
 * device, so a grant revoked from another device since then still exports;
 * the contract refuses the agent regardless. The roster holds the openings
 * once the account is signed in or created, so the wallet must have done
 * one of them.
 *
 * A read grant's `view` is exported only while the seal this client
 * stored holds the secret of the `enc_key` the account was at on the last
 * sign-in, grant call or device removal. A seal of an earlier key is
 * stale, its secret no longer opens what the account receives, so the
 * policy leaves `view` out rather than hand the agent a key the liveness
 * check would refuse; so does a read grant whose seal this client could
 * not renew on a rotation, and every read grant after a device or grant
 * call failed, since a rotation it ran may have landed, until the next
 * sign-in or rotation publishes the key again. The grant still
 * authorises spending, and its grantee reads again once a rotation from
 * this client re-seals it or the grant is issued anew. Nothing re-seals on
 * export: sealing needs the passkey, which an export never asks for. A
 * client whose record was lost holds the seals again once it signs in,
 * which rebuilds the grants this device issued from its grant records in
 * the account's inbox.
 *
 * The policy holds the scope salt, which lets its holder open the grant's
 * commitments, and for a read grant the sealed viewing secret, which
 * opens only with the agent's read secret: hand it only to the agent the
 * grant is for. It is a snapshot, and revoking the grant does not recall
 * it; the contract stops the agent, and the rotation a revocation
 * performs blinds the agent to every later holding.
 *
 * @throws {@link NoAccountError} When the wallet has no Passport
 *   account in state.
 * @throws {@link GrantNotFoundError} When the account's roster has no such
 *   grant.
 * @throws {@link GrantRevokedError} When the grant was revoked.
 * @throws {@link GrantOpeningUnavailableError} When this client holds no
 *   opening for the grant, because another client issued it.
 */
export const exportPassportAgentPolicy = async (
  wallet: WalletWithPassport,
  { grantId }: ExportPassportAgentPolicyProps,
): Promise<PassportAgentPolicy> => {
  const { selectAccount$, selectGrants$, selectEncKey$ } =
    wallet.stateObservables.passport;
  const account = await firstValueFrom(selectAccount$);
  if (!account) {
    throw new NoAccountError(
      'The wallet holds no Passport account; create it or sign in first.',
    );
  }
  const grants = await firstValueFrom(selectGrants$);
  const grant = grants.find(({ id }) => id === grantId);
  if (!grant) {
    throw new GrantNotFoundError(
      `The account at ${account.address} holds no grant ${grantId}.`,
    );
  }
  if (!grant.active) {
    throw new GrantRevokedError(
      `The grant ${grantId} of the account at ${account.address} is revoked.`,
    );
  }
  const { opening, scope } = grant;
  if (!opening) throw new GrantOpeningUnavailableError();
  const encKey = await firstValueFrom(selectEncKey$);
  const view =
    opening.view !== undefined && opening.view.sealedEncKey === encKey
      ? toBase64Url(opening.view.seal)
      : undefined;
  return {
    type: 'passport-agent-policy',
    version: PASSPORT_AGENT_POLICY_VERSION,
    network: account.networkId,
    account: account.address,
    grantId: grant.id,
    slot: grant.slot,
    granteeScheme: opening.granteeScheme,
    granteePublicKey: opening.granteePublicKey,
    scopeSalt: opening.scopeSalt,
    color: opening.color,
    recipient: opening.recipient,
    maxCoinValue: opening.maxCoinValue,
    perCallCap: scope.perCallCap,
    cap: scope.cap,
    expiresAt: scope.expiresAt,
    window: null,
    operations: scope.operations,
    origin: opening.origin,
    ...(view === undefined ? {} : { view }),
  };
};
