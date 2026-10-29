import {
  AccAddress,
  OperationNotInstallableError,
} from '@lace-contract/passport';

import { loadVerifierKeys } from '../acc/deploy';
import { DEPLOYED_OPERATIONS } from '../acc/deployed-operations';
import { planInstallWaves } from '../acc/wave-plan';
import { createIndexerClient } from '../infra/indexer';
import { createMidnightProviders } from '../infra/providers';

import { queryAccountLedger, queryAccountOperations } from './account-call';
import { inKeySession } from './key-session';
import { assertInstallSigner, installVerifierKeys } from './maintenance';
import { readAccountInbox } from './rotation';

import type { AccountCallInput, FlowContext } from './types';
import type { MaintenanceVerifierKey } from '@lace-contract/passport';

/** The account to upgrade and the operations of the deployed roster it should gain. */
export type InstallOperationsInput = Pick<AccountCallInput, 'account'> & {
  operations: readonly string[];
};

/**
 * What a completed install leaves behind: `operations`, those it
 * installed, and `alreadyInstalled`, those requested that the account
 * already held, each in the deployed roster's order.
 */
export type InstalledOperations = {
  operations: string[];
  alreadyInstalled: string[];
};

/**
 * The requested operations split by whether the account already holds
 * them, each in installation order, the deployed roster's.
 *
 * @throws {@link OperationNotInstallableError} naming every requested
 * operation outside the deployed roster, or when nothing is requested.
 */
const installableOperations = (
  requested: readonly string[],
  installed: readonly string[],
): InstalledOperations => {
  const outside = requested.filter(
    operation => !DEPLOYED_OPERATIONS.includes(operation),
  );
  if (outside.length > 0) {
    throw new OperationNotInstallableError(
      `Not operations this module deploys: ${outside.join(', ')}.`,
    );
  }
  if (requested.length === 0) {
    throw new OperationNotInstallableError(
      'No operation was named to install.',
    );
  }
  const named = DEPLOYED_OPERATIONS.filter(operation =>
    requested.includes(operation),
  );
  return {
    operations: named.filter(operation => !installed.includes(operation)),
    alreadyInstalled: named.filter(operation => installed.includes(operation)),
  };
};

/** The inserts of one wave, each operation with the verifier key loaded for it. */
const insertsOf = (
  operations: readonly string[],
  keys: ReadonlyMap<string, Uint8Array>,
): MaintenanceVerifierKey[] =>
  operations.map(operation => {
    const verifierKey = keys.get(operation);
    if (!verifierKey) {
      throw new Error(`No verifier key loaded for '${operation}'`);
    }
    return { operation, verifierKey };
  });

/**
 * Installs on an unlocked account the verifier keys of operations of the
 * deployed roster it lacks, so an account created under an earlier
 * roster gains the circuits added since without a new deployment. Only
 * operations this module deploys can be installed, never a recovery
 * circuit or another device arm, and each key is the one pinned for its
 * operation, which the encryption key checks again before it signs.
 *
 * The operations the account holds and its maintenance authority are
 * read from chain before any prompt: a request naming no operation, or an
 * operation outside the roster, is refused with
 * OperationNotInstallableError naming them. Requested operations the
 * account already holds are skipped, so an install interrupted after some
 * waves landed is finished by running it again; when it holds every one,
 * this resolves with nothing submitted and no prompt. Otherwise a locked
 * account is refused with AuthorityRetiredError, and an encryption key
 * that cannot sign maintenance updates with
 * MaintenanceUpdateRefusedError. The verifier
 * keys are then downloaded against their pins and packed into waves
 * under the per-transaction budget. In one key session naming the
 * account and the operations, the keyring is read from the ledger as it
 * stands then, so a rotation that landed during the downloads is
 * followed, and the encryption key signs each wave with the roster key
 * of this device's keyring whose authority the chain holds; an authority none of them derives is refused with
 * MaintenanceAuthorityMismatchError before anything is submitted. Each
 * wave waits for the chain to show the advanced counter, so this
 * resolves once the chain holds every installed key, with the operations
 * it installed and those it skipped.
 *
 * No gated call is made, so the use counter and the record are left as
 * they are. The transactions' sponsoring stage is reported through
 * `onProgress`.
 */
export const installOperations = async (
  { account, operations: requested }: InstallOperationsInput,
  { seams, onProgress }: FlowContext,
): Promise<InstalledOperations> => {
  const { address } = account;
  const { indexerUrl, indexerWsUrl } = seams.passportNetwork;
  const indexer = createIndexerClient({ indexerUrl, indexerWsUrl });
  const { operations, alreadyInstalled } = installableOperations(
    requested,
    await queryAccountOperations(indexer, address),
  );
  if (operations.length === 0) return { operations, alreadyInstalled };
  await assertInstallSigner({
    address,
    indexer,
    encryptionKey: seams.passportEncryptionKey,
  });
  const providers = await createMidnightProviders({
    network: seams.passportNetwork,
    prover: seams.passportProver,
    sponsor: seams.passportSponsor,
    onStage: onProgress,
  });
  const { keys, sizes } = await loadVerifierKeys(providers, operations);
  const waves = planInstallWaves(operations, sizes).map(wave =>
    insertsOf(wave.operations, keys),
  );
  return inKeySession(
    seams.passportAuthoriser,
    { kind: 'install-operations', account: AccAddress(address), operations },
    async () => {
      const { keyring } = readAccountInbox(
        address,
        await queryAccountLedger(indexer, address),
        await seams.passportEncryptionKey.readerPublicKey(
          seams.passportNetwork.networkId,
        ),
      );
      await installVerifierKeys({
        address,
        seams,
        providers,
        keyring,
        waves,
      });
      return { operations, alreadyInstalled };
    },
  );
};
