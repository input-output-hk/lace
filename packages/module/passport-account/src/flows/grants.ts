import {
  AccAddress,
  AccountNotFoundError,
  GrantIssueRejectedError,
  GrantNotFoundError,
  GrantOriginMissingError,
  GrantRevokedError,
  GrantRosterUnsettledError,
  GrantScopeInvalidError,
  NotAuthorisedError,
  validateGrantScope,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { GRANTEE_WITHDRAWAL_CIRCUITS } from '../acc/grant-circuits';
import {
  originHash,
  prepareIssueGrant,
  prepareRevokeAllGrants,
  prepareRevokeGrant,
} from '../acc/grants';
import { readGrants } from '../acc/read-grants';

import {
  isNotAuthorisedAbort,
  queryAccountLedger,
  queryAccountOperations,
  readAccountLedger,
  UNKNOWN_ENTRY_ABORT,
} from './account-call';
import { inKeySession } from './key-session';
import {
  callChain,
  liveDeviceEntries,
  readLocalDevice,
  rotateEncKey,
  sealViews,
  viewCapability,
} from './rotation';
import {
  completedRecord,
  liveStoredReadGrants,
  retainStoredGrants,
  storedGrantOpenings,
  storedGrantSlots,
  withSealedViews,
  withStoredGrant,
  withStoredGrantView,
} from './stored-grants';

import type { AccountLedger } from './account-call';
import type { RotatedEncKey, ViewCapability } from './rotation';
import type {
  AccountCallInput,
  AccountRecords,
  FlowContext,
  PassportAccountRecord,
  StoredGrants,
} from './types';
import type { Ledger } from '../acc/acc-module';
import type { GrantCircuitCall } from '../acc/grants';
import type { GrantOpenings, GrantSlots } from '../acc/read-grants';
import type { IndexerClient } from '../infra/indexer';
import type {
  GrantBookkeeping,
  GrantId,
  GrantRecord,
  GrantScopeInput,
  GranteeScheme,
  KeySessionFlow,
  PassportDevice,
} from '@lace-contract/passport';

/** Contract abort naming a grant the grants map does not hold. */
const UNKNOWN_GRANT_ABORT = 'failed assert: unknown grant';

/** Contract abort refusing a revoke over a grant already inactive. */
const GRANT_NOT_LIVE_ABORT = 'failed assert: grant not live';

/** Contract abort refusing an issue over a grant id that is still active. */
const GRANT_ACTIVE_ABORT = 'failed assert: grant already active';

/**
 * How long an accepted call is given to show in the indexer's view of the
 * grants map, which can lag the block the call landed in.
 */
const ROSTER_POLL_ATTEMPTS = 30;
const ROSTER_POLL_DELAY_MS = 1000;
const MILLISECONDS_PER_SECOND = 1000;

const sleep = async (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

/** What an issue request carries beyond the account it acts on. */
export type IssueGrantInput = AccountCallInput & { scope: GrantScopeInput };

/** What a revoke request carries beyond the account it acts on. */
export type RevokeGrantInput = AccountCallInput & { grantId: GrantId };

/**
 * What an accepted grant call leaves behind: the grant roster as the
 * chain now holds it, the device roster with this device's row on its
 * successor entry, and the advanced use counter that entry sits at. A
 * call that rotated the encryption key also names the `enc_key` it
 * stepped to, as 32-byte lowercase hex, and lists the live read grants
 * the new secret could not be sealed to, the one an issue issued
 * included, whose grantees read nothing newer until they are issued
 * again, and apart from them the live read grants the hosted signer
 * refused because it signed their revocation, which has not landed, so
 * they are revoked again rather than issued again; both lists are empty
 * otherwise. A rotating call also lists the
 * live device entries whose devices got no new key because their
 * registrations conflict, which need to be enrolled again.
 */
export type GrantRoster = {
  grants: GrantRecord[];
  devices: PassportDevice[];
  localUseCounter: string;
  encKey?: string;
  unsealedGrantIds: GrantId[];
  revocationPendingGrantIds: GrantId[];
  droppedDevices?: string[];
};

/** A grant roster with the id of the grant the call issued. */
export type IssuedGrant = GrantRoster & { grantId: GrantId };

/**
 * What an issue keeps on chain once its grant shows active: the grant's
 * bookkeeping, sealed to this device alone, and for a read grant the read
 * key the new secret is sealed to.
 */
type IssuedBookkeeping = {
  bookkeeping: GrantBookkeeping;
  readPublicKey?: string;
};

type GrantCallConfig = {
  call: GrantCircuitCall;
  /** The flow named to the key session. */
  flow: KeySessionFlow;
  /** The record's grant bookkeeping once the call is accepted. */
  nextStoredGrants: (
    stored: StoredGrants | undefined,
  ) => StoredGrants | undefined;
  /**
   * Whether that bookkeeping is also written ahead of the submission,
   * under the counter the record already holds, so a call that lands
   * while the process dies before the write leaves nothing the record
   * cannot open.
   */
  writeBeforeCall: boolean;
  /** Whether a roster read after the call reflects it. */
  isSettled: (roster: readonly GrantRecord[]) => boolean;
  /** The view members of the key, when the call rotates it ahead of itself. */
  rotation?: ViewCapability;
  /**
   * Whether the new secret is sealed again to the other live read grants
   * right after the rotation lands, and which grant to leave out: the one
   * the call issues or revokes. A revoke-all leaves nobody to seal to.
   */
  reseal?: { except: GrantId };
  issued?: IssuedBookkeeping;
};

const isActive = (roster: readonly GrantRecord[], grantId: GrantId): boolean =>
  roster.some(record => record.id === grantId && record.active);

const activeCount = (roster: readonly GrantRecord[]): number =>
  roster.filter(record => record.active).length;

const nowSeconds = (): number =>
  Math.floor(Date.now() / MILLISECONDS_PER_SECOND);

/**
 * Types a raw contract abort by the assert message the Account Custody
 * Contract raises; anything unrecognised passes through unchanged. An
 * unknown-entry abort can only come from the caller check here, since no
 * grant circuit names a device entry.
 */
const classifyContractAbort = (error: unknown): unknown => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(UNKNOWN_GRANT_ABORT)) {
    return new GrantNotFoundError(message);
  }
  if (message.includes(GRANT_NOT_LIVE_ABORT)) {
    return new GrantRevokedError(message);
  }
  if (message.includes(GRANT_ACTIVE_ABORT)) {
    return new GrantIssueRejectedError(message);
  }
  if (message.includes(UNKNOWN_ENTRY_ABORT) || isNotAuthorisedAbort(message)) {
    return new NotAuthorisedError(message);
  }
  return error;
};

/**
 * Refuses a device whose storage holds no account record before any
 * ceremony. The gate only runs a call over an account in state, so an
 * absent record means the storage was cleared underneath it.
 */
const assertRecordPresent = async (
  accountRecords: AccountRecords,
): Promise<void> => {
  if ((await accountRecords.presence()) === 'absent') {
    throw new AccountNotFoundError(
      'No Passport account record is stored on this device.',
    );
  }
};

/**
 * The stored record of the account a grant call acts on, read inside the
 * session where it costs no extra prompt. Presence was checked ahead of
 * the session, so a missing record here vanished in between.
 */
const storedRecord = async (
  accountRecords: AccountRecords,
): Promise<PassportAccountRecord> => {
  const record = await accountRecords.read();
  if (!record) {
    throw new AccountNotFoundError(
      'No Passport account record is stored on this device.',
    );
  }
  return record;
};

type SettledRosterProps = {
  indexer: IndexerClient;
  address: string;
  slots: GrantSlots;
  openings: GrantOpenings;
  isSettled: GrantCallConfig['isSettled'];
};

/**
 * The ledger state once the indexer reflects the accepted call, with the
 * roster read from it. The submission settled in a block, but the
 * indexer can serve the state from before it for a moment, and a roster
 * read then would deny the call its own result.
 *
 * @throws {@link GrantRosterUnsettledError} when the indexer never
 * reflects the call within the polling window.
 */
const awaitSettledRoster = async ({
  indexer,
  address,
  slots,
  openings,
  isSettled,
}: SettledRosterProps): Promise<{
  ledgerState: Ledger;
  roster: GrantRecord[];
}> => {
  for (let attempt = 0; attempt < ROSTER_POLL_ATTEMPTS; attempt++) {
    const ledgerState = await queryAccountLedger(indexer, address);
    const roster = readGrants(ledgerState, slots, openings);
    if (isSettled(roster)) return { ledgerState, roster };
    await sleep(ROSTER_POLL_DELAY_MS);
  }
  throw new GrantRosterUnsettledError(
    `The grant roster of ${address} never reflected the accepted call.`,
  );
};

type GrantCallProps = {
  config: GrantCallConfig;
  input: AccountCallInput;
  /** The account's ledger state as read before the call, with its indexer. */
  ledger: AccountLedger;
  /** The grant roster read from that ledger state. */
  roster: readonly GrantRecord[];
  context: FlowContext;
};

/**
 * Runs one gated grant call inside a single key session, so the use
 * counter rescan and the authorisation cost one ceremony rather than one
 * per authoriser call. A device whose storage holds no record is refused
 * ahead of the session. The record is read inside it, where it costs no
 * extra prompt, its grant bookkeeping narrowed to the grants whose kept
 * fields open what the ledger read before the call holds under their id,
 * so an entry an issue wrote before a call that never landed is neither
 * an opening nor a re-seal target. It is rewritten with the advanced
 * counter and the grant bookkeeping after every call, so a roster is
 * never published ahead of the record that anchors the next rescan and
 * names the slots. A call
 * that keeps its bookkeeping ahead of the submission writes it once more
 * before it, under the counter the record holds. A call that rotates the
 * encryption key does so in the same session ahead of its own circuit.
 * The other live read grants are sealed the new secret right after the
 * rotation lands, their seals kept in the record and on chain before the
 * call is submitted, so they keep reading whatever the call's outcome.
 * Once the roster shows an issued grant active, its bookkeeping is
 * appended to the inbox, sealed to this device alone, and the grantee of
 * a read grant is sealed the new secret, the seal kept the same way. The
 * wait for the indexer is reported as 'confirming' and the appends as
 * 'recording'. The contract's own aborts surface as typed errors;
 * anything else, and a failing on-chain status in particular, rejects
 * unchanged with the counter unmoved.
 */
const runGrantCall = async ({
  config: {
    call,
    flow,
    nextStoredGrants,
    writeBeforeCall,
    isSettled,
    rotation,
    reseal,
    issued,
  },
  input: { account, devices, localUseCounter },
  ledger: { indexer, ledgerState },
  roster: listed,
  context: { seams, accountRecords, onProgress },
}: GrantCallProps): Promise<GrantRoster> => {
  const { networkId } = seams.passportNetwork;
  const accountAddress = AccAddress(account.address);
  try {
    await assertRecordPresent(accountRecords);
    const rotationDevices = rotation
      ? liveDeviceEntries(ledgerState)
      : undefined;
    return await inKeySession(
      seams.passportAuthoriser,
      rotationDevices ? { ...flow, devices: rotationDevices } : flow,
      async () => {
        const record = await storedRecord(accountRecords);
        let stored = nextStoredGrants(
          await retainStoredGrants(record.grants, listed, account.address),
        );
        const write = async (counter: string): Promise<void> =>
          accountRecords.write(
            completedRecord(account, counter, { grants: stored }),
          );
        if (writeBeforeCall) await write(record.localUseCounter);
        const chain = callChain({
          account,
          start: { ledgerState, localUseCounter, devices },
          indexer,
          seams,
          onProgress,
          onAdvanced: write,
        });
        const counter = (): string =>
          chain.position().localUseCounter ?? record.localUseCounter;
        const roster = (state: Ledger): GrantRecord[] =>
          readGrants(
            state,
            storedGrantSlots(stored),
            storedGrantOpenings(stored),
          );
        let rotated: RotatedEncKey | undefined;
        let unsealedGrantIds: GrantId[] = [];
        let revocationPendingGrantIds: GrantId[] = [];
        if (rotation) {
          rotated = await rotateEncKey({
            account,
            encryptionKey: seams.passportEncryptionKey,
            view: rotation,
            local: await readLocalDevice(seams),
            chain,
            indexer,
            networkId,
            onProgress,
            devices: rotationDevices ?? [],
          });
          if (reseal) {
            const views = await sealViews({
              view: rotation,
              networkId,
              keyring: rotated.keyring,
              account: accountAddress,
              targets: liveStoredReadGrants(
                stored,
                roster(chain.position().ledgerState),
                reseal.except,
              ),
            });
            stored = withSealedViews(stored, views);
            unsealedGrantIds = views.unsealed;
            revocationPendingGrantIds = views.revocationPending;
            await write(counter());
            await chain.append('recording', views.entries);
          }
        }
        await chain.submit(call);
        onProgress('confirming');
        const settled = await awaitSettledRoster({
          indexer,
          address: account.address,
          slots: storedGrantSlots(stored),
          openings: storedGrantOpenings(stored),
          isSettled,
        });
        let grants = settled.roster;
        if (issued) {
          const entries = await seams.passportEncryptionKey.sealGrant(
            networkId,
            accountAddress,
            issued.bookkeeping,
          );
          if (rotation && rotated && issued.readPublicKey !== undefined) {
            const views = await sealViews({
              view: rotation,
              networkId,
              keyring: rotated.keyring,
              account: accountAddress,
              targets: [
                {
                  grantId: issued.bookkeeping.grantId,
                  readPublicKey: issued.readPublicKey,
                },
              ],
            });
            stored = withSealedViews(stored, views);
            unsealedGrantIds = [...unsealedGrantIds, ...views.unsealed];
            revocationPendingGrantIds = [
              ...revocationPendingGrantIds,
              ...views.revocationPending,
            ];
            entries.push(...views.entries);
            await write(counter());
            grants = roster(settled.ledgerState);
          }
          await chain.append('recording', entries);
        }
        return {
          grants,
          devices: chain.position().devices,
          localUseCounter: counter(),
          ...(rotated
            ? {
                encKey: HexBytes.fromByteArray(rotated.encKey),
                droppedDevices: rotated.dropped,
              }
            : {}),
          unsealedGrantIds,
          revocationPendingGrantIds,
        };
      },
    );
  } catch (error) {
    throw classifyContractAbort(error);
  }
};

/**
 * Refuses a grant its grantee could never spend: one naming a scheme
 * whose withdrawals the account was deployed without. Installing them
 * takes a maintenance update, which a locked account can no longer sign
 * and an unlocked one no longer holds the key for, so the issue is
 * refused before the owner is asked to authorise it.
 *
 * @throws {@link GrantScopeInvalidError} when a withdrawal of the
 * grantee's scheme is not installed on the account.
 */
const requireGranteeWithdrawals = async (
  indexer: IndexerClient,
  address: string,
  scheme: GranteeScheme,
): Promise<void> => {
  const installed = new Set(await queryAccountOperations(indexer, address));
  const missing = GRANTEE_WITHDRAWAL_CIRCUITS[scheme].filter(
    circuit => !installed.has(circuit),
  );
  if (missing.length > 0) {
    throw new GrantScopeInvalidError(
      `the account cannot serve a ${scheme} grantee, it lacks ${missing.join(
        ', ',
      )}`,
    );
  }
};

/**
 * Issues a scoped grant to an agent key. The scope is checked against the
 * rules the contract asserts before any prompt: a shielded operation
 * needs read, a read grant needs a canonical read public key, a rolling
 * window is refused because the contract reserves its bounds, and a
 * grant beyond sixteen active ones is refused as Lace's limit. Each
 * refusal is a GrantScopeInvalidError or GrantLimitReachedError and costs
 * no ceremony; a host with no relying party id is refused with
 * GrantOriginMissingError before the chain is read, and a read grant
 * with ReadUnavailableError when the encryption key held here cannot
 * share the viewing secret. The grant id is derived from the account,
 * the grantee key, the hash of this host's relying party id and the
 * first slot free for that pair, and the scope salt is drawn fresh; the
 * local device then authorises `issue_grant_with_jubjub` over the id and
 * the salted scope digest, which binds the hash of the read key. The key
 * session is opened with the account, the slot, the salt and the digest
 * beside the id and the scope, so an authoriser that does not share this
 * flow's memory can re-derive both before it signs.
 *
 * A read grant delivers the account's viewing secret, and read is total:
 * the grantee sees every shielded holding, current and future, until the
 * key is rotated again. So the key is rotated first, in the same session:
 * a fresh random secret is sealed to every device, the live holdings are
 * re-encrypted towards it, its public key replaces `enc_key`, and only
 * then is the grant issued, so the grantee reads nothing of the
 * account's spent history. Right after the rotation lands the new secret
 * is sealed to every other live read grant this client holds the key of,
 * so they keep reading even should the issue fail, and once the grant
 * shows active it is sealed to the grantee's read key; the seals join
 * the bookkeeping, and the grantee's reaches it through the agent
 * policy, never the chain. A grantee seal the key seam refuses after the
 * grant landed leaves the grant active and unsealed, named among the
 * result's unsealed grants, rather than failing the issue.
 *
 * The slot and salt are kept in the account record, since the contract
 * stores neither, together with the object fields its commitment hides
 * (colour, recipient and coin bound) and the read key, which the grantee
 * needs to open it and which reach the roster as the grant's opening.
 * They are written before the call is submitted: a grant that lands
 * without its salt could never be opened for its grantee. A call that
 * never lands leaves a stale entry, which the next sign-in prunes against
 * the chain and a later issue over the same id overwrites. Once the
 * grant shows active the same bookkeeping, and each seal, is appended to
 * the inbox in grant records only this device opens, so a sign-in after
 * the record is lost rebuilds it. The roster is read back from chain
 * once the grant shows active in it.
 *
 * A grant id the contract still holds active rejects with
 * GrantIssueRejectedError, and a rejected authorisation with
 * NotAuthorisedError. The transaction's proving and sponsoring stages,
 * the rotation, the wait for the indexer and the appends are reported
 * through `onProgress`.
 */
export const issueGrant = async (
  { scope, ...input }: IssueGrantInput,
  context: FlowContext,
): Promise<IssuedGrant> => {
  const { rpId, seams } = context;
  if (rpId === undefined) {
    throw new GrantOriginMissingError();
  }
  const view = scope.read ? viewCapability(seams.passportEncryptionKey) : null;
  const { account } = input;
  const ledger = await readAccountLedger(
    account.address,
    seams.passportNetwork,
  );
  await requireGranteeWithdrawals(
    ledger.indexer,
    account.address,
    scope.grantee.scheme,
  );
  const roster = readGrants(ledger.ledgerState);
  validateGrantScope(scope, {
    nowSeconds: nowSeconds(),
    grantCount: activeCount(roster),
  });
  const { grantId, slot, scopeSalt, scopeDigest, call } = prepareIssueGrant({
    contractAddress: ByteArray.fromHex(HexBytes(account.address)),
    scope,
    originHash: await originHash(rpId),
    roster,
  });
  const readPublicKey = view ? scope.readPublicKey : undefined;
  const object = {
    color: scope.color,
    recipient: scope.recipient,
    maxCoinValue: scope.maxCoinValue,
  };
  const issued = await runGrantCall({
    config: {
      call,
      flow: {
        kind: 'issue-grant',
        grantId,
        scope,
        account: AccAddress(account.address),
        slot,
        scopeSalt,
        scopeDigest,
      },
      nextStoredGrants: stored =>
        withStoredGrant(stored, grantId, {
          slot,
          scopeSalt,
          granteeScheme: scope.grantee.scheme,
          granteePublicKey: scope.grantee.publicKey,
          origin: rpId,
          object,
          ...(readPublicKey === undefined ? {} : { view: { readPublicKey } }),
        }),
      writeBeforeCall: true,
      isSettled: settled => isActive(settled, grantId),
      ...(view && readPublicKey !== undefined
        ? { rotation: view, reseal: { except: grantId } }
        : {}),
      issued: {
        bookkeeping: {
          grantId,
          slot,
          scopeSalt,
          granteeScheme: scope.grantee.scheme,
          granteePublicKey: scope.grantee.publicKey,
          object,
          ...(readPublicKey === undefined ? {} : { readPublicKey }),
        },
        ...(readPublicKey === undefined ? {} : { readPublicKey }),
      },
    },
    input,
    ledger,
    roster,
    context,
  });
  return { grantId, ...issued };
};

/**
 * The stored grants with the seal of one grant dropped, its read key
 * kept: a revoked read grant's seal holds a secret the rotation that
 * follows retires.
 */
const withoutSeal = (
  stored: StoredGrants | undefined,
  grantId: GrantId,
): StoredGrants | undefined => {
  const view = stored?.[grantId]?.view;
  return stored && view
    ? withStoredGrantView(stored, grantId, {
        readPublicKey: view.readPublicKey,
      })
    : stored;
};

/**
 * Revokes one grant by its id. A grant the chain does not hold is refused
 * with GrantNotFoundError before any prompt, and one it lists inactive
 * with GrantRevokedError; the same errors type the contract's own aborts
 * should the grant vanish or be revoked elsewhere in between. The local
 * device authorises `revoke_grant_with_jubjub`. The grant stays in the
 * roster as an inactive tombstone, so its stored slot and salt are kept,
 * and the roster is read back from chain once the grant shows inactive.
 *
 * Revoking a read grant also rotates the encryption key, in the same
 * session ahead of the revocation: a fresh random secret is sealed to
 * every device and the live holdings are re-encrypted towards it, so the
 * revoked grantee keeps what it already read and nothing newer, and
 * right after the rotation lands the new secret is sealed again to every
 * other read grant this client holds the read key of, ahead of the
 * revocation. A read grant is refused with ReadUnavailableError before
 * any prompt when the encryption key held here cannot re-encrypt and
 * seal.
 */
export const revokeGrant = async (
  { grantId, ...input }: RevokeGrantInput,
  context: FlowContext,
): Promise<GrantRoster> => {
  const { account } = input;
  const ledger = await readAccountLedger(
    account.address,
    context.seams.passportNetwork,
  );
  const roster = readGrants(ledger.ledgerState);
  const listed = roster.find(record => record.id === grantId);
  if (!listed) {
    throw new GrantNotFoundError(
      `The account at ${account.address} holds no grant ${grantId}.`,
    );
  }
  if (!listed.active) {
    throw new GrantRevokedError(
      `The grant ${grantId} of the account at ${account.address} is already revoked.`,
    );
  }
  const rotation = listed.scope.read
    ? viewCapability(context.seams.passportEncryptionKey)
    : undefined;
  return runGrantCall({
    config: {
      call: prepareRevokeGrant(grantId),
      flow: {
        kind: 'revoke-grant',
        grantId,
        account: AccAddress(account.address),
        ...(rotation ? { read: true } : {}),
      },
      nextStoredGrants: stored =>
        rotation ? withoutSeal(stored, grantId) : stored,
      writeBeforeCall: false,
      isSettled: settled => !isActive(settled, grantId),
      ...(rotation ? { rotation, reseal: { except: grantId } } : {}),
    },
    input,
    ledger,
    roster,
    context,
  });
};

/**
 * Revokes every grant the account has issued: the local device
 * authorises `revoke_all_grants_with_jubjub`, which clears the grants
 * map and advances the grant generation. The record's grant bookkeeping
 * is dropped with the map, and the roster is read back from chain once
 * it lists nothing, tombstones included. While any read grant is live,
 * the encryption key is rotated in the same session ahead of the call
 * and the live holdings are re-encrypted, so no revoked grantee reads
 * on; with every grant gone there is nobody to re-seal to. The rotation
 * is refused with ReadUnavailableError before any prompt when the
 * encryption key held here cannot re-encrypt.
 */
export const revokeAllGrants = async (
  input: AccountCallInput,
  context: FlowContext,
): Promise<GrantRoster> => {
  const { account } = input;
  const ledger = await readAccountLedger(
    account.address,
    context.seams.passportNetwork,
  );
  const roster = readGrants(ledger.ledgerState);
  const hasLiveReadGrant = roster.some(
    record => record.active && record.scope.read,
  );
  const rotation = hasLiveReadGrant
    ? viewCapability(context.seams.passportEncryptionKey)
    : undefined;
  return runGrantCall({
    config: {
      call: prepareRevokeAllGrants(),
      flow: {
        kind: 'revoke-all-grants',
        account: AccAddress(account.address),
        ...(rotation ? { read: true } : {}),
      },
      nextStoredGrants: () => undefined,
      writeBeforeCall: false,
      isSettled: settled => settled.length === 0,
      ...(rotation ? { rotation } : {}),
    },
    input,
    ledger,
    roster,
    context,
  });
};
