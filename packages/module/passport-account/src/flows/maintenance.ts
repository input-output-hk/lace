import {
  AuthorityRetiredError,
  MaintenanceAuthorityMismatchError,
  MaintenanceUpdateRefusedError,
} from '@lace-contract/passport';

import {
  readMaintenanceAuthority,
  submitMaintenanceUpdate,
} from '../acc/deploy';
import { maintenanceUpdateOf } from '../acc/maintenance-authority';
import { createMidnightProviders } from '../infra/providers';

import type { FlowProgress } from './types';
import type { AccProviders } from '../acc/deploy';
import type { IndexerClient } from '../infra/indexer';
import type {
  AccountKeyring,
  MaintenanceChanges,
  MaintenanceVerifierKey,
  MaintenanceVerifyingKey,
  PassportDependencies,
  PassportEncryptionKey,
} from '@lace-contract/passport';
import type * as NetworkIdModule from '@midnight-ntwrk/midnight-js-network-id';
import type * as Ledger from '@midnightntwrk/ledger-v9';

/** Loads the ledger and the network id the update is built and submitted with. */
const importLedgerModules = async () =>
  Promise.all([
    import('@midnightntwrk/ledger-v9'),
    import('@midnight-ntwrk/midnight-js-network-id'),
  ]);

/**
 * The maintenance authority of the account at `address` as `publicData`
 * serves it. An update must read its counter through the provider its
 * submission polls, so a lagging read cannot hand the next update a
 * counter the chain already moved past.
 */
const authorityOnChain = async (
  ledger: typeof Ledger,
  publicData: unknown,
  address: string,
): Promise<Ledger.ContractMaintenanceAuthority> =>
  readMaintenanceAuthority({
    providers: { publicDataProvider: publicData },
    ledger,
    address,
  });

/** The refusal of a key that cannot sign over an account whose authority is live. */
const missingSigner = (address: string): MaintenanceUpdateRefusedError =>
  new MaintenanceUpdateRefusedError(
    `The encryption key held here cannot sign maintenance updates, so the maintenance authority of the account at ${address} cannot follow its roster.`,
  );

/** The account {@link assertMaintenanceSigner} checks and the key it checks. */
type AssertMaintenanceSignerProps = {
  address: string;
  indexer: IndexerClient;
  encryptionKey: PassportEncryptionKey;
};

/**
 * Refuses a roster rotation the maintenance authority could not follow,
 * before any prompt: an encryption key that signs no maintenance update
 * over an account whose authority is live. A locked account, whose
 * committee is empty, has no authority to follow.
 *
 * @throws {@link MaintenanceUpdateRefusedError} when the key cannot sign
 * and the account's authority is live.
 */
export const assertMaintenanceSigner = async ({
  address,
  indexer,
  encryptionKey,
}: AssertMaintenanceSignerProps): Promise<void> => {
  if (encryptionKey.signMaintenanceUpdate) return;
  const [ledger] = await importLedgerModules();
  const { committee } = await authorityOnChain(ledger, indexer, address);
  if (committee.length > 0) throw missingSigner(address);
};

/** The refusal of a key that cannot sign the install of missing operations. */
const missingInstallSigner = (address: string): MaintenanceUpdateRefusedError =>
  new MaintenanceUpdateRefusedError(
    `The encryption key held here cannot sign maintenance updates, so no operation can be installed on the account at ${address}.`,
  );

/** The refusal of an install on an account whose authority was retired. */
const lockedAccount = (address: string): AuthorityRetiredError =>
  new AuthorityRetiredError(
    `The account at ${address} is locked: its maintenance authority is retired, so no operation can be installed.`,
  );

/**
 * The one key of a live committee, which some roster key must derive.
 *
 * @throws {@link MaintenanceAuthorityMismatchError} when the committee
 * is not one key.
 */
const soleMember = (
  address: string,
  committee: readonly Ledger.SignatureVerifyingKey[],
): MaintenanceVerifyingKey => {
  if (committee.length !== 1) {
    throw new MaintenanceAuthorityMismatchError(
      `The maintenance authority of the account at ${address} is a committee of ${committee.length} keys, not one a roster key derives.`,
    );
  }
  const [{ tag, value }] = committee;
  return { tag, value };
};

/** What {@link assertHoldsRosterAuthority} checks the account's authority against. */
type AssertHoldsRosterAuthorityProps = {
  address: string;
  seams: PassportDependencies;
  indexer: IndexerClient;
  /** This device's keyring over the ledger before the rotation. */
  keyring: AccountKeyring;
};

/**
 * Refuses a roster rotation whose move of the maintenance authority would
 * fail, inside the key session and before anything is submitted: an
 * unlocked account whose one-key committee no roster key of the keyring
 * derives. A locked account, whose committee is empty, has no authority
 * to move. The encryption key answers only whether the keyring holds the
 * authority; a key that cannot answer leaves the refusal to the move.
 *
 * @throws {@link MaintenanceAuthorityMismatchError} when the committee
 * is not one key some roster key of the keyring derives.
 */
export const assertHoldsRosterAuthority = async ({
  address,
  seams,
  indexer,
  keyring,
}: AssertHoldsRosterAuthorityProps): Promise<void> => {
  const holds = seams.passportEncryptionKey.holdsMaintenanceAuthority;
  if (!holds) return;
  const [ledger] = await importLedgerModules();
  const { committee } = await authorityOnChain(ledger, indexer, address);
  if (committee.length === 0) return;
  const authority = soleMember(address, committee);
  if (!(await holds(seams.passportNetwork.networkId, keyring, authority))) {
    throw new MaintenanceAuthorityMismatchError(
      `No roster key this device holds derives the maintenance authority of the account at ${address}, so the roster cannot rotate.`,
    );
  }
};

/** What {@link signAndSubmit} signs, and where it submits the update. */
type SignAndSubmitProps = {
  ledger: typeof Ledger;
  networkId: typeof NetworkIdModule;
  providers: AccProviders;
  address: string;
  seams: PassportDependencies;
  sign: NonNullable<PassportEncryptionKey['signMaintenanceUpdate']>;
  keyring: AccountKeyring;
  /** The one key of the live committee, which signs the update. */
  authority: MaintenanceVerifyingKey;
  /** The committee's counter on chain, which the update is built against. */
  counter: bigint;
  changes: MaintenanceChanges;
  /** Names the update in a failure. */
  label: string;
};

/**
 * Has the encryption key sign `changes` over the keyring with the roster
 * key whose authority the chain holds, rebuilds the update as it was
 * signed and submits it, resolving once the chain shows the advanced
 * counter.
 */
const signAndSubmit = async ({
  ledger,
  networkId,
  providers,
  address,
  seams,
  sign,
  keyring,
  authority,
  counter,
  changes,
  label,
}: SignAndSubmitProps): Promise<void> => {
  const { signature } = await sign(seams.passportNetwork.networkId, {
    keyring,
    authority,
    counter,
    changes,
  });
  await submitMaintenanceUpdate({
    providers,
    ledger,
    address,
    networkId,
    update: maintenanceUpdateOf(ledger, {
      address: keyring.account,
      counter,
      changes,
    }),
    signature,
    label,
  });
};

/** What {@link followRosterAuthority} moves the authority with. */
type FollowRosterAuthorityProps = {
  address: string;
  seams: PassportDependencies;
  /**
   * This device's keyring over the ledger the rotation left: the live
   * secret with the new roster key, and the earlier secrets, the previous
   * roster key among them.
   */
  keyring: AccountKeyring;
  /** The authority the new live roster key derives, which the replace installs. */
  authority: MaintenanceVerifyingKey;
  onProgress: FlowProgress;
};

/**
 * Moves the maintenance authority of an unlocked account to the one the
 * new live roster key derives, after a rotation drew a fresh roster key,
 * so a removed device loses its upgrade rights and every device sealed
 * the new roster key holds them. The authority is read from chain: an
 * empty committee is a locked account and nothing is submitted. Otherwise
 * the encryption key signs the replace with the roster key among the
 * keyring's whose authority the chain holds, the update is rebuilt as it
 * was signed and submitted, and this resolves once the chain shows the
 * advanced counter, so the next call runs under the new authority.
 *
 * @throws {@link MaintenanceUpdateRefusedError} when the key cannot sign
 * maintenance updates, or refuses the replace.
 * @throws {@link MaintenanceAuthorityMismatchError} when the committee
 * is not one key some roster key of the keyring derives.
 */
export const followRosterAuthority = async ({
  address,
  seams,
  keyring,
  authority,
  onProgress,
}: FollowRosterAuthorityProps): Promise<void> => {
  const [ledger, networkId] = await importLedgerModules();
  const providers = await createMidnightProviders({
    network: seams.passportNetwork,
    prover: seams.passportProver,
    sponsor: seams.passportSponsor,
    onStage: onProgress,
  });
  const onChain = await authorityOnChain(
    ledger,
    providers.publicDataProvider,
    address,
  );
  if (onChain.committee.length === 0) return;
  const sign = seams.passportEncryptionKey.signMaintenanceUpdate;
  if (!sign) throw missingSigner(address);
  const member = soleMember(address, onChain.committee);
  await signAndSubmit({
    ledger,
    networkId,
    providers,
    address,
    seams,
    sign,
    keyring,
    authority: member,
    counter: onChain.counter,
    changes: { kind: 'replace-authority', authority },
    label: 'Maintenance authority rotation',
  });
};

/**
 * Refuses an install of missing operations the account's authority
 * could not sign, before any prompt: a locked account, whose committee
 * is empty, and an encryption key that signs no maintenance update.
 *
 * @throws {@link AuthorityRetiredError} when the account is locked.
 * @throws {@link MaintenanceUpdateRefusedError} when the key cannot sign.
 */
export const assertInstallSigner = async ({
  address,
  indexer,
  encryptionKey,
}: AssertMaintenanceSignerProps): Promise<void> => {
  const [ledger] = await importLedgerModules();
  const { committee } = await authorityOnChain(ledger, indexer, address);
  if (committee.length === 0) throw lockedAccount(address);
  if (!encryptionKey.signMaintenanceUpdate) throw missingInstallSigner(address);
};

/** What {@link installVerifierKeys} installs and over which keyring. */
type InstallVerifierKeysProps = {
  address: string;
  seams: PassportDependencies;
  /** The providers the waves read the authority through and are submitted through. */
  providers: AccProviders;
  /** This device's keyring, whose roster keys derive the account's authority. */
  keyring: AccountKeyring;
  /** The verifier keys of each wave, one maintenance update each, in order. */
  waves: readonly (readonly MaintenanceVerifierKey[])[];
};

/**
 * Installs verifier keys on an unlocked account, one maintenance update
 * per wave, each signed by the encryption key with the roster key whose
 * authority the chain holds. The authority is read from chain before
 * every wave, because each applied update advances its counter, and
 * every wave resolves only once the chain shows the advanced counter, so
 * this resolves once the chain holds every key. The authority stays the
 * one that signs: no wave replaces it.
 *
 * @throws {@link MaintenanceUpdateRefusedError} when the key cannot sign
 * maintenance updates, or refuses a verifier key.
 * @throws {@link AuthorityRetiredError} when the account is locked.
 * @throws {@link MaintenanceAuthorityMismatchError} when the committee
 * is not one key some roster key of the keyring derives.
 */
export const installVerifierKeys = async ({
  address,
  seams,
  providers,
  keyring,
  waves,
}: InstallVerifierKeysProps): Promise<void> => {
  const [ledger, networkId] = await importLedgerModules();
  const sign = seams.passportEncryptionKey.signMaintenanceUpdate;
  if (!sign) throw missingInstallSigner(address);
  for (const [index, inserts] of waves.entries()) {
    const { committee, counter } = await authorityOnChain(
      ledger,
      providers.publicDataProvider,
      address,
    );
    if (committee.length === 0) throw lockedAccount(address);
    await signAndSubmit({
      ledger,
      networkId,
      providers,
      address,
      seams,
      sign,
      keyring,
      authority: soleMember(address, committee),
      counter,
      changes: { kind: 'insert-verifier-keys', inserts },
      label: `Operation install ${index + 1} of ${waves.length}`,
    });
  }
};
