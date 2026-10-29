import {
  AccAddress,
  AccountContractMissingError,
  AccountCreationPendingError,
  AccountNotFoundError,
  EncryptionKeyMismatchError,
  UseCounter,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import { ledger } from '../acc/acc-module';
import { isLaceRecord } from '../acc/envelopes';
import { readGrants } from '../acc/read-grants';
import { resolveUseCounter } from '../acc/use-counter';
import { createIndexerClient } from '../infra/indexer';

import { inKeySession } from './key-session';
import { readAccountInbox, readLocalDevice } from './rotation';
import {
  completedRecord,
  rebuildStoredGrants,
  retainStoredGrants,
  storedGrantOpenings,
  storedGrantSlots,
  unsealedStoredReadGrants,
  withRebuiltGrants,
} from './stored-grants';

import type {
  FlowAccountState,
  FlowContext,
  PassportAccountRecord,
} from './types';
import type {
  GrantId,
  GrantRecordPart,
  OpenedInboxEntry,
  PassportDevice,
} from '@lace-contract/passport';

/**
 * What a completed sign-in restores: the ready account, its whole device
 * roster with only this device marked local, this device's healed use
 * counter, the account's grant roster, the `enc_key` it is at, and the
 * live read grants this client issued whose kept seal does not hold the
 * secret of that `enc_key`.
 */
export type RecognisedAccount = FlowAccountState & {
  unsealedGrantIds: GrantId[];
};

/**
 * The account's whole device roster, read from the on-chain device set.
 * Entries are opaque rolling commitments, so a remote entry carries no
 * identity beyond its commitment: only the local device can be named, by
 * the commitment its own rescan resolved.
 */
const toDeviceRoster = (
  entries: Iterable<Uint8Array>,
  localCommitmentHex: string,
): PassportDevice[] =>
  Array.from(entries, entry => {
    const commitmentHex = HexBytes.fromByteArray(entry);
    return { commitmentHex, isLocal: commitmentHex === localCommitmentHex };
  });

/**
 * Refuses a record whose creation is still unfinished on chain. A record
 * that carries a pending deployment names a contract that may still miss
 * verifier keys, its initial device or the entries that deliver the
 * account keys, which only the create flow can complete; but a creation
 * that appended its key entries and then died before its final record
 * write left a usable account behind, and the chain's boot flag and inbox
 * tell the two apart.
 */
const assertCreationComplete = (
  record: PassportAccountRecord,
  isActivated: boolean,
  entries: readonly Uint8Array[],
): void => {
  const { deployment } = record;
  if (deployment === undefined) return;
  const held = new Set<string>(
    entries.map(entry => HexBytes.fromByteArray(entry)),
  );
  if (!isActivated || deployment.keyEntries.some(entry => !held.has(entry))) {
    throw new AccountCreationPendingError(
      `The account at ${record.address} is deployed but not yet ready; resume the creation on this device, from the site that started it.`,
    );
  }
};

/** The grant record parts the Lace records of an inbox opened to. */
const grantPartsOf = (
  opened: readonly (OpenedInboxEntry | null)[],
): GrantRecordPart[] =>
  opened.flatMap(entry => (entry?.kind === 'grant' ? [entry.record] : []));

/**
 * Recognises an existing Passport account on this device: the passkey
 * ceremony (implicit in the first authoriser use) proves the device key,
 * the persisted account record names the Account Custody Contract, the
 * indexer confirms the contract is live, this device's own envelopes in
 * the contract's inbox open a secret deriving the `enc_key` the contract
 * advertises, and the use-counter rescan restores this device's roster
 * position from the on-chain device set. The account secret is never
 * read from the record or derived from the passkey: it is random, and
 * this device reaches it only through an envelope sealed to its reader
 * key, so a device enrolled with its own passkey signs in without the
 * record of the device that created the account. The roster is rebuilt
 * from every entry in the device set, so a device enrolled elsewhere
 * survives a reload; only the local entry is named, the rest are opaque
 * commitments. The grant roster is read from the contract's grants map
 * the same way, with the slots and openings the record kept for the
 * grants this client issued; a grant the record lacks, as after the
 * record was lost, is rebuilt from the grant records this device keeps in
 * the inbox once they open its on-chain commitments under this host's
 * relying party id, its seal kept only while it holds the live secret.
 * A grant the record holds is kept only while its fields open the
 * commitments the chain holds under its id, so an entry an issue wrote
 * before a call that never landed gives way to the grant another client
 * of the account issued over the same id, and a rebuilt grant takes its
 * place when there is one. The live read grants whose kept seal does not
 * hold the live secret, as after an issue that failed before its seal,
 * are reported as unsealed.
 * The devices registered under the live roster key are kept in the
 * record as the roster the next rotation seals to. The whole chain runs
 * inside one key session, so it costs a single ceremony rather than one
 * per authoriser call.
 *
 * The healed counter is written back to the persisted record before this
 * resolves, so the next sign-in rescans from a fresh anchor instead of the
 * creation-time one. That write also completes a record a creation left
 * pending after its key entries landed, dropping the deployment and the
 * authority key it carries, and drops the bookkeeping of grants the chain
 * no longer holds or whose commitments it does not open. A missing record
 * raises AccountNotFoundError, a record whose address holds no live
 * contract raises AccountContractMissingError,
 * a record whose creation is unfinished on chain raises
 * AccountCreationPendingError, and an inbox holding no envelope of this
 * device that opens the live `enc_key`, as for a device never handed the
 * keys or removed since, raises EncryptionKeyMismatchError before the
 * rescan runs; rediscovering an account by name service when no record is
 * persisted is a separate flow and out of scope here.
 *
 * signIn reports no intermediate stage: the ceremony, the indexer read and
 * the rescan all settle before there is anything to report.
 */
export const signIn = async ({
  seams,
  accountRecords,
  rpId,
}: FlowContext): Promise<RecognisedAccount> => {
  const { passportAuthoriser, passportEncryptionKey, passportNetwork } = seams;

  return inKeySession(passportAuthoriser, { kind: 'sign-in' }, async () => {
    const local = await readLocalDevice(seams);
    const record = await accountRecords.read();
    if (!record) {
      throw new AccountNotFoundError(
        'No Passport account record is stored on this device.',
      );
    }
    const indexer = createIndexerClient({
      indexerUrl: passportNetwork.indexerUrl,
      indexerWsUrl: passportNetwork.indexerWsUrl,
    });
    const state = await indexer.queryContractState(record.address);
    if (!state) {
      throw new AccountContractMissingError(
        `No live Account Custody Contract found at ${record.address}.`,
      );
    }
    const ledgerState = ledger(state.data);
    const { entries, keyring } = readAccountInbox(
      record.address,
      ledgerState,
      local.readerPublicKey,
    );
    assertCreationComplete(record, ledgerState.booted, entries);
    if (keyring.envelopes.length === 0) {
      throw new EncryptionKeyMismatchError(
        `The inbox of the account at ${record.address} holds no envelope for this device.`,
      );
    }
    const grantParts = grantPartsOf(
      await passportEncryptionKey.openInbox(
        passportNetwork.networkId,
        keyring,
        entries.filter(isLaceRecord),
      ),
    );
    const { useCounter, commitmentHex } = await resolveUseCounter({
      ledgerState,
      authoriser: passportAuthoriser,
      address: AccAddress(record.address),
      knownUseCounter: UseCounter(BigInt(record.localUseCounter)),
    });
    const devices = toDeviceRoster(ledgerState.devices, commitmentHex);
    const encKey = HexBytes.fromByteArray(ledgerState.enc_key);
    const onChain = readGrants(ledgerState);
    const stored = withRebuiltGrants(
      await retainStoredGrants(record.grants, onChain, record.address),
      rpId === undefined
        ? undefined
        : await rebuildStoredGrants(grantParts, onChain, {
            address: record.address,
            origin: rpId,
            encKey,
          }),
      encKey,
    );
    const grants = readGrants(
      ledgerState,
      storedGrantSlots(stored),
      storedGrantOpenings(stored),
    );
    const localUseCounter = useCounter.toString();
    await accountRecords.write(
      completedRecord(record, localUseCounter, { grants: stored }),
    );
    return {
      account: {
        address: record.address,
        bindingVersion: record.bindingVersion,
        status: 'ready',
        networkId: passportNetwork.networkId,
      },
      devices,
      localUseCounter,
      grants,
      encKey,
      unsealedGrantIds: unsealedStoredReadGrants(stored, onChain, encKey),
    };
  });
};
