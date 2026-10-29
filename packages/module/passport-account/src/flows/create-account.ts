import {
  AccAddress,
  AccountExistsError,
  DeviceEpoch,
  UseCounter,
} from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { deployAccount, resumeAccountDeployment } from '../acc/deploy';
import { inboxEntries } from '../acc/inbox-walk';
import { accManifest } from '../acc/manifest';
import {
  isPendingDeployment,
  lockChoiceMismatch,
} from '../acc/pending-deployment';
import { createMidnightProviders } from '../infra/providers';

import { readAccountLedger } from './account-call';
import { inKeySession } from './key-session';
import { callChain, readLocalDevice } from './rotation';
import { completedRecord } from './stored-grants';

import type { LocalDevice } from './rotation';
import type {
  AccountRecords,
  FlowAccountState,
  FlowContext,
  PassportAccountRecord,
  PendingDeployment,
} from './types';
import type { AccProviders, DeployedAccount } from '../acc/deploy';

/** The initial device entry is inserted at epoch 0 with use counter 0. */
const INITIAL_DEVICE_EPOCH = DeviceEpoch(0n);
const INITIAL_USE_COUNTER_VALUE = '0';

/** The caller's choices for a new account. */
export type CreateAccountInput = {
  /**
   * Whether the last deployment wave retires the contract maintenance
   * authority, or hands it to the account's devices through the
   * authority the roster key derives; see {@link deployAccount} for what
   * each choice trades.
   */
  lockAccount: boolean;
};

/**
 * What a completed creation leaves behind: the ready account, a roster
 * holding only this device, this device's use counter, an empty grant
 * roster, and the `enc_key` the account was created with.
 */
export type CreatedAccount = FlowAccountState;

/** A record whose account is deployed but not yet completely installed. */
type PendingRecord = PassportAccountRecord & { deployment: PendingDeployment };

/**
 * The record of a creation left unfinished on this device, read inside
 * the session once presence reported one. A record that opens without a
 * pending deployment, or that this authoriser cannot open, refuses with
 * AccountExistsError: it names an account that must not be created over.
 * A record that carries only the marker of its creation, which a hosted
 * signer shows no flow but the creation, cannot be resumed and is
 * refused, as is one started under another lock choice than
 * `lockAccount`, with CreationLockMismatchError naming the recorded one.
 */
const pendingRecord = async (
  accountRecords: AccountRecords,
  lockAccount: boolean,
): Promise<PendingRecord> => {
  const record = await accountRecords.read();
  if (!record?.deployment) throw new AccountExistsError();
  if (!isPendingDeployment(record.deployment)) {
    throw new Error(
      `The unfinished creation of the account at ${record.address} was read without its deployment, so it cannot be resumed.`,
    );
  }
  if (record.deployment.lockAccount !== lockAccount) {
    throw lockChoiceMismatch(record.deployment.lockAccount);
  }
  return { ...record, deployment: record.deployment };
};

type DeploymentProps = {
  providers: AccProviders;
  lockAccount: boolean;
  pending: PendingRecord | undefined;
  local: LocalDevice;
  context: FlowContext;
};

/**
 * A deployment with what its pending record holds, the key entries its
 * creating device appends once active among them.
 */
type Deployment = { deployed: DeployedAccount; pending: PendingDeployment };

/**
 * Runs the deployment: a fresh one, which draws the account keys first,
 * deploys with their `enc_key`, hands an unlocked account's maintenance
 * to the authority their roster key derives, and records the pending
 * deployment, with this device's envelope and registration, as soon as
 * the deploy lands so an interruption can be resumed; or the remaining
 * waves of a recorded one, with the key entries and the handover
 * authority it recorded. Both wait for the fee sponsor to be ready
 * before building each transaction.
 */
const deploy = async ({
  providers,
  lockAccount,
  pending,
  local,
  context: { seams, accountRecords },
}: DeploymentProps): Promise<Deployment> => {
  const {
    passportAuthoriser,
    passportEncryptionKey,
    passportNetwork,
    passportSponsor,
  } = seams;
  const sponsorReady = async () => passportSponsor.ready?.();
  if (pending) {
    return {
      deployed: await resumeAccountDeployment({
        providers,
        authoriser: passportAuthoriser,
        address: pending.address,
        pending: pending.deployment,
        sponsorReady,
      }),
      pending: pending.deployment,
    };
  }
  const keys = await passportEncryptionKey.createKeys(
    passportNetwork.networkId,
    { devicePublicKey: local.devicePublicKey },
  );
  const keyEntries = [...keys.envelopes, ...keys.registrations].map(entry =>
    HexBytes.fromByteArray(entry),
  );
  const progress: { recorded?: PendingDeployment } = {};
  const deployed = await deployAccount({
    providers,
    authoriser: passportAuthoriser,
    encPublicKey: keys.encKey,
    lockAccount,
    handoverAuthority: keys.authority,
    sponsorReady,
    onDeployed: async (address, deployment) => {
      progress.recorded = { ...deployment, keyEntries };
      await accountRecords.write({
        address,
        bindingVersion: accManifest.bindingVersion,
        localUseCounter: INITIAL_USE_COUNTER_VALUE,
        deployment: progress.recorded,
      });
    },
  });
  if (!progress.recorded) {
    throw new Error('The deployment landed without reporting its progress.');
  }
  return { deployed, pending: progress.recorded };
};

/**
 * Creates a Passport account: the passkey ceremony (implicit in the first
 * authoriser use), the account keys drawn through the encryption key
 * seam, the Account Custody Contract deployment in waves with sponsored
 * fees, the initial device activation, the delivery of the account keys
 * to this device's inbox, and the local persistence of the account
 * record. Every step runs inside one key session, so the whole flow costs
 * a single ceremony rather than one per authoriser call. The flow never
 * holds the encryption secret: the seam draws it at random, seals it to
 * this device's reader key and hands back only its public key, which the
 * constructor takes as `enc_key`, with this device's envelope and its
 * registration under a fresh roster key; once the device is active, both
 * are appended to the inbox, one gated call each, so the account keys
 * live on chain from the start.
 *
 * Progress is reported through `onProgress`: 'deploying' once the
 * authoriser has produced the device key, 'proving' and 'sponsoring' from
 * inside each transaction submission (a transaction proves first, then
 * the sponsor balances it), 'activating' before the activation call and
 * 'recording' before the key entries are appended. The record is written
 * before the promise resolves, so a process that dies right after still
 * recognises the account on next startup.
 *
 * The flow runs to completion once started: cancelling mid-deploy could
 * orphan a contract the sponsor already paid for. The caller's flow gate
 * is what keeps a second request from starting one. Should the process
 * die between waves anyway, the record written when the deploy landed
 * names the contract, what it still needs and the key entries, and the
 * next create request on this device resumes from the operations the
 * chain holds, activates once every wave is in and appends whichever key
 * entry the inbox still lacks; a creation that died after its activation
 * landed resumes from there. A resumed creation finishes exactly as it
 * began, with the keys recorded then: a request under another lock choice
 * than the recorded one is refused with CreationLockMismatchError, and a
 * build pinning other verifier keys than the recorded deployment with
 * CreationArtefactMismatchError, both before any wave. The session names
 * the lock choice, so an authoriser that asks consent first shows it; a
 * hosted signer refuses the same lock mismatch itself, and a resume
 * started from another origin than the creation it resumes.
 *
 * A device already holding a completed account record refuses with
 * AccountExistsError before the ceremony runs: the record is the only
 * pointer to the deployed contract and there is no recovery path, so
 * creating over it would orphan the existing account. Presence is read
 * without opening the record, and it tells a completed record from an
 * unfinished one, so a sealed record blocks the flow without costing a
 * prompt and only a record the flow may resume is opened, inside the
 * session, where it costs no extra prompt.
 */
export const createAccount = async (
  { lockAccount }: CreateAccountInput,
  context: FlowContext,
): Promise<CreatedAccount> => {
  const { seams, accountRecords, onProgress } = context;
  const presence = await accountRecords.presence();
  if (presence === 'complete') {
    throw new AccountExistsError();
  }
  const {
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  } = seams;

  return inKeySession(
    passportAuthoriser,
    { kind: 'create-account', lockAccount },
    async () => {
      const local = await readLocalDevice(seams);
      const pending =
        presence === 'pending'
          ? await pendingRecord(accountRecords, lockAccount)
          : undefined;
      onProgress('deploying');
      const providers = await createMidnightProviders({
        network: passportNetwork,
        prover: passportProver,
        sponsor: passportSponsor,
        onStage: onProgress,
      });
      const { deployed, pending: deployment } = await deploy({
        providers,
        lockAccount,
        pending,
        local,
        context,
      });
      if (!deployed.isActivated) {
        onProgress('activating');
        await deployed.activate();
      }
      const account = {
        address: deployed.address,
        bindingVersion: accManifest.bindingVersion,
        status: 'ready' as const,
        networkId: passportNetwork.networkId,
      };
      const startCounter =
        pending?.localUseCounter ?? INITIAL_USE_COUNTER_VALUE;
      const { indexer, ledgerState } = await readAccountLedger(
        deployed.address,
        passportNetwork,
      );
      const held = new Set<string>(
        inboxEntries(ledgerState).map(entry => HexBytes.fromByteArray(entry)),
      );
      const chain = callChain({
        account,
        start: {
          ledgerState,
          localUseCounter: startCounter,
          devices: [
            {
              commitmentHex: await passportAuthoriser.deviceCommitment(
                AccAddress(deployed.address),
                INITIAL_DEVICE_EPOCH,
                UseCounter(BigInt(startCounter)),
              ),
              isLocal: true,
            },
          ],
        },
        indexer,
        seams,
        onProgress,
        onAdvanced: async localUseCounter =>
          accountRecords.write({
            address: account.address,
            bindingVersion: account.bindingVersion,
            localUseCounter,
            deployment,
          }),
      });
      await chain.append(
        'recording',
        deployment.keyEntries
          .filter(entry => !held.has(entry))
          .map(entry => ByteArray.fromHex(HexBytes(entry))),
      );
      const { localUseCounter, devices } = chain.position();
      const counter = localUseCounter ?? startCounter;
      await accountRecords.write(completedRecord(account, counter, {}));
      return {
        account,
        devices,
        localUseCounter: counter,
        grants: [],
        encKey: HexBytes.fromByteArray(ledgerState.enc_key),
      };
    },
  );
};
