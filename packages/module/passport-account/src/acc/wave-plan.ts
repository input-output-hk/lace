import { AuthorityRetiredError } from '@lace-contract/passport';

/**
 * Most verifier key bytes one transaction may carry. A deploy or
 * maintenance update above it is refused by the node for exhausting the
 * block limits, so the roster is split into waves packed under this
 * figure. The budget is a packing heuristic over the measured key sizes,
 * not the node's own weight check.
 */
const VERIFIER_BYTE_BUDGET = 15_000;

/** The verifier key size of each operation, in bytes. */
export type VerifierKeySizes = ReadonlyMap<string, number>;

/**
 * One transaction of a deployment: the contract deploy itself, or one
 * maintenance update inserting a batch of verifier keys. The last
 * maintenance wave also replaces the deploy-time maintenance authority,
 * so a replace-only wave carries no operations.
 */
export type DeployWave = {
  kind: 'deploy' | 'maintenance';
  /** Operations whose verifier keys this wave installs, in roster order. */
  operations: string[];
  /** The verifier key bytes this wave carries. */
  verifierBytes: number;
  replacesAuthority: boolean;
};

export type WavePlanOptions = {
  /** Verifier bytes per wave; defaults to {@link VERIFIER_BYTE_BUDGET}. */
  budget?: number;
};

/**
 * What a resumed deployment is planned from: the roster it was begun
 * with and its key sizes, the operations the contract already holds on
 * chain, and whether the deploy-time maintenance authority has already
 * been replaced, by a retirement or a handover.
 */
export type ResumePlanProps = WavePlanOptions & {
  operations: readonly string[];
  sizes: VerifierKeySizes;
  installed: readonly string[];
  isAuthorityReplaced: boolean;
};

type Batch = Pick<DeployWave, 'operations' | 'verifierBytes'>;

const sizeOf = (sizes: VerifierKeySizes, operation: string): number => {
  const size = sizes.get(operation);
  if (size === undefined) {
    throw new Error(`No verifier key size for operation '${operation}'`);
  }
  return size;
};

const assertBudget = (budget: number): void => {
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error(
      `The verifier byte budget must be a positive number, got ${budget}`,
    );
  }
};

/**
 * Packs the operations greedily, in order, into batches no larger than
 * the budget. Greedy over one fixed order keeps the plan deterministic
 * for a given roster and key set, so a retry computes the same waves.
 */
const packOperations = (
  operations: readonly string[],
  sizes: VerifierKeySizes,
  budget: number,
): Batch[] => {
  const batches: Batch[] = [];
  let current: Batch = { operations: [], verifierBytes: 0 };
  for (const operation of operations) {
    const size = sizeOf(sizes, operation);
    if (size > budget) {
      throw new Error(
        `The verifier key of '${operation}' (${size} bytes) exceeds the ${budget} byte wave budget`,
      );
    }
    if (current.verifierBytes + size > budget) {
      batches.push(current);
      current = { operations: [], verifierBytes: 0 };
    }
    current.operations.push(operation);
    current.verifierBytes += size;
  }
  if (current.operations.length > 0) batches.push(current);
  return batches;
};

/**
 * The maintenance waves for the given batches. The replacement of the
 * deploy-time authority rides on the last of them, the last update that
 * needs it; with nothing left to install, a replace-only update is the
 * whole of it.
 */
const toMaintenanceWaves = (batches: Batch[]): DeployWave[] => {
  const waves: DeployWave[] = batches.map(batch => ({
    kind: 'maintenance',
    ...batch,
    replacesAuthority: false,
  }));
  const last = waves.at(-1);
  if (last) last.replacesAuthority = true;
  else {
    waves.push({
      kind: 'maintenance',
      operations: [],
      verifierBytes: 0,
      replacesAuthority: true,
    });
  }
  return waves;
};

/**
 * Plans a fresh deployment: the deploy carries the longest prefix of the
 * roster under the budget, and every later wave is one maintenance update
 * with the next batch. The order is the roster's, so the activation
 * circuit lands in the deploy and the account is usable as early as the
 * waves allow.
 */
export const planDeployWaves = (
  operations: readonly string[],
  sizes: VerifierKeySizes,
  { budget = VERIFIER_BYTE_BUDGET }: WavePlanOptions = {},
): DeployWave[] => {
  assertBudget(budget);
  const [deploy, ...rest] = packOperations(operations, sizes, budget);
  if (!deploy) throw new Error('A deployment needs at least one operation');
  return [
    { kind: 'deploy', ...deploy, replacesAuthority: false },
    ...toMaintenanceWaves(rest),
  ];
};

/**
 * Plans the waves a deployed contract still needs: the roster operations
 * not yet installed, packed as maintenance updates, and the replacement
 * of the deploy-time authority while it is still live.
 * Installed operations are read from chain rather than from any local
 * count, so a wave that landed without being recorded is never sent
 * twice.
 *
 * @throws {@link AuthorityRetiredError} when operations are missing but
 * the deploy-time authority is already replaced: nothing that holds it
 * can install them any more.
 */
export const planResumeWaves = ({
  operations,
  sizes,
  installed,
  isAuthorityReplaced,
  budget = VERIFIER_BYTE_BUDGET,
}: ResumePlanProps): DeployWave[] => {
  assertBudget(budget);
  const installedSet = new Set(installed);
  const missing = operations.filter(operation => !installedSet.has(operation));
  if (isAuthorityReplaced) {
    if (missing.length > 0) {
      throw new AuthorityRetiredError(
        `The deploy-time maintenance authority is replaced and ${
          missing.length
        } operations are not installed: ${missing.join(', ')}`,
      );
    }
    return [];
  }
  return toMaintenanceWaves(packOperations(missing, sizes, budget));
};

/**
 * Plans the waves that install `operations` on a live account: one
 * maintenance update per batch packed under the budget, in the order
 * given, none replacing the authority, which stays the one that signs
 * them.
 */
export const planInstallWaves = (
  operations: readonly string[],
  sizes: VerifierKeySizes,
  { budget = VERIFIER_BYTE_BUDGET }: WavePlanOptions = {},
): DeployWave[] => {
  assertBudget(budget);
  return packOperations(operations, sizes, budget).map(batch => ({
    kind: 'maintenance',
    ...batch,
    replacesAuthority: false,
  }));
};
