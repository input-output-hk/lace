import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_CREATOR_INDEX_GAP,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
  custodyDeviceAccountIndex,
} from '@lace-lib/cardano-custody';
import { Err, Ok } from '@lace-lib/util';
import { filter, firstValueFrom, map, merge, timeout } from 'rxjs';

import {
  createCardanoCustodyAccountEntity,
  putCardanoCustodyAccount,
} from './cardano-custody-account-entity';
import { deriveCardanoCustodyDevice } from './cardano-custody-device';
import {
  CardanoCustodyIndexExhaustedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyUnsupportedVersionError,
} from './cardano-custody-errors';
import {
  custodyActionObservables,
  readCardanoChainId,
} from './cardano-custody-wallet';
import { custodyBuildErrorOf } from './request-cardano-custody-build';

import type { CardanoCustodyDeviceKey } from './cardano-custody-device';
import type { CardanoCustodyAccountRecord } from './cardano-custody-records';
import type { WalletWithCardanoCustody } from './cardano-custody-wallet';
import type { Bip32PublicKeyHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';
import type {
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
} from '@lace-contract/cardano-context';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { CustodyContractVersion } from '@lace-lib/cardano-custody';
import type { Result } from '@lace-lib/util';

/**
 * The most creator indices one recovery probes, over every contract
 * version. A run of indices pre-registered by someone else is skipped
 * without counting toward the gap, so this bound alone stops a scan an
 * attacker keeps extending.
 */
const RECOVERY_PROBE_LIMIT = 1000;

/** How long one probe may take; it reads the chain twice at most, with retries. */
const PROBE_TIMEOUT_MS = 60_000;

/** The options of `recoverCardanoCustodyAccounts`. */
export type RecoverCardanoCustodyAccountsProps = {
  /**
   * The passkey's custody device keys on the wallet's network, from
   * `requestCardanoCustodyDeviceKey`: the CIP-1854 account key the current
   * contract version uses on the network.
   */
  device: Pick<
    CardanoCustodyDeviceKey,
    'channel' | 'extendedAccountPublicKey' | 'networkMagic'
  > & {
    /**
     * The same passkey's CIP-1854 account keys `m/1854'/1815'/a'` for
     * contract versions whose device keys live under another account `a`,
     * by `a`. A version whose key is missing is not scanned.
     */
    extendedAccountPublicKeys?: Partial<Record<number, Bip32PublicKeyHex>>;
  };
  /** The first creator index to examine in every contract version; 0 by default. */
  startIndex?: number;
  /** The name of the account created at a creator index. */
  name?: (creatorIndex: number) => string;
};

/** An account recovery found and opened, at the creator index that created it. */
export type CardanoCustodyRecoveredAccount = {
  accountId: AccountId;
  creatorIndex: number;
  /** Names the account's contract version by its account validator hash. */
  record: CardanoCustodyAccountRecord;
};

/**
 * A supported contract version whose creator keys live under a CIP-1854
 * account no given key belongs to, so recovery could not derive them.
 */
export type CardanoCustodyUnscannedVersion = {
  accountValidatorHash: Hash28ByteBase16;
  deviceAccountIndex: number;
};

/**
 * What `recoverCardanoCustodyAccounts` found: the accounts it opened, and
 * the contract versions it could not scan for want of their account key.
 */
export type CardanoCustodyRecovery = {
  accounts: CardanoCustodyRecoveredAccount[];
  unscannedVersions: CardanoCustodyUnscannedVersion[];
};

const defaultName = (creatorIndex: number) =>
  `Cardano custody #${creatorIndex}`;

type ProbeOutcome =
  | {
      readonly error: CardanoCustodyCreatorIndexProbeError;
      readonly ok: false;
    }
  | {
      readonly ok: true;
      readonly result: CardanoCustodyCreatorIndexProbeResult;
    };

/**
 * Asks the wallet's Cardano module what one creator index holds, and waits
 * for its answer under a fresh request id.
 *
 * @throws {@link TimeoutError} When no module answers in time.
 */
const probeCreatorIndex = async (
  wallet: Pick<WalletWithCardanoCustody, 'actionObservables' | 'dispatch'>,
  probe: Omit<CardanoCustodyCreatorIndexProbeRequest, 'requestId'>,
): Promise<ProbeOutcome> => {
  const requestId = crypto.randomUUID();
  const {
    probeCustodyCreatorIndexCompleted$,
    probeCustodyCreatorIndexFailed$,
  } = custodyActionObservables(wallet);
  // Subscribed before dispatching: a module may answer synchronously.
  const outcome = firstValueFrom(
    merge(
      probeCustodyCreatorIndexCompleted$.pipe(
        filter(({ payload }) => payload.requestId === requestId),
        map(
          ({ payload }): ProbeOutcome => ({ ok: true, result: payload.result }),
        ),
      ),
      probeCustodyCreatorIndexFailed$.pipe(
        filter(({ payload }) => payload.requestId === requestId),
        map(
          ({ payload }): ProbeOutcome => ({ ok: false, error: payload.error }),
        ),
      ),
    ).pipe(timeout(PROBE_TIMEOUT_MS)),
  );
  wallet.dispatch('cardanoCustody.probeCustodyCreatorIndex', {
    ...probe,
    requestId,
  });
  return outcome;
};

const probeErrorOf = (error: CardanoCustodyCreatorIndexProbeError): Error =>
  error.code === 'unsupported-contract-version'
    ? new CardanoCustodyUnsupportedVersionError(error.accountValidatorHash)
    : custodyBuildErrorOf(error);

type FoundAccount = {
  creatorIndex: number;
  record: CardanoCustodyAccountRecord;
  /** The CIP-1854 account key the creator key derives from. */
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

/**
 * Scans the creator indices of one contract version from `startIndex` until
 * `CUSTODY_CREATOR_INDEX_GAP` unregistered indices follow the last account
 * found. A pre-registered index neither counts toward that gap nor restarts
 * it.
 */
const scanVersion = async (
  wallet: WalletWithCardanoCustody,
  {
    version,
    extendedAccountPublicKey,
    startIndex,
    budget,
  }: {
    version: CustodyContractVersion;
    extendedAccountPublicKey: Bip32PublicKeyHex;
    startIndex: number;
    /** Probes left for the whole recovery, shared by every version. */
    budget: { probes: number };
  },
): Promise<Result<FoundAccount[], Error>> => {
  const found: FoundAccount[] = [];
  let gap = 0;
  for (let creatorIndex = startIndex; gap < CUSTODY_CREATOR_INDEX_GAP; ) {
    if (budget.probes === 0) {
      return Err(
        new CardanoCustodyIndexExhaustedError(startIndex, RECOVERY_PROBE_LIMIT),
      );
    }
    budget.probes -= 1;
    const outcome = await probeCreatorIndex(wallet, {
      accountValidatorHash: version.accountValidatorHash,
      deviceAccountPublicKey: extendedAccountPublicKey,
      creatorIndex,
    });
    if (!outcome.ok) return Err(probeErrorOf(outcome.error));
    const { result } = outcome;
    if (result.status === 'account') {
      found.push({
        creatorIndex,
        record: result.record,
        extendedAccountPublicKey,
      });
      gap = 0;
    } else if (result.status === 'unregistered') {
      gap += 1;
    }
    creatorIndex += 1;
  }
  return Ok(found);
};

/**
 * Finds and opens every account a passkey created on the wallet's network,
 * in every supported contract version.
 *
 * Each version's creator indices are probed from `startIndex` until
 * `CUSTODY_CREATOR_INDEX_GAP` indices without a registered stake credential
 * follow the last account found. Indices someone else registered first are
 * skipped without counting toward that gap. Every index whose address holds a control UTxO
 * is opened with this device bound at that index (added, or updated in
 * place when the wallet holds it). An account whose state no longer lists
 * its creator opens all the same; its state shows the device is not listed.
 *
 * Each version is scanned with the CIP-1854 account key it uses on the
 * network: the device key for the current version's account, and
 * `device.extendedAccountPublicKeys` for any other. A version without its
 * key is not scanned and is listed in `unscannedVersions`. Each account
 * opens with the device bound under its own version's key.
 *
 * Each probe reads the chain through the wallet's Cardano module; nothing
 * is built, signed or funded. The scan is bounded: past its probe limit it
 * fails with {@link CardanoCustodyIndexExhaustedError} and opens nothing.
 *
 * It is safe to call right after `createLaceWallet`: it waits up to 30
 * seconds for the wallet to select its network, and fails with
 * `CardanoCustodyNetworkNotReadyError` when none is selected.
 *
 * @param wallet - A wallet with the Cardano modules loaded.
 * @returns A `Result`: each account it opened, with its creator index and
 *   record, and each contract version it could not scan.
 */
export const recoverCardanoCustodyAccounts = async (
  wallet: WalletWithCardanoCustody,
  {
    device: {
      extendedAccountPublicKey,
      extendedAccountPublicKeys,
      networkMagic,
      channel,
    },
    startIndex = 0,
    name = defaultName,
  }: RecoverCardanoCustodyAccountsProps,
): Promise<Result<CardanoCustodyRecovery, Error>> => {
  try {
    const chainId = await readCardanoChainId(wallet);
    if (networkMagic !== chainId.networkMagic) {
      return Err(
        new CardanoCustodyInvalidOperationError('network-mismatch', {
          networkMagic,
        }),
      );
    }
    const currentAccountIndex = custodyDeviceAccountIndex(
      CURRENT_CUSTODY_CONTRACT_VERSION,
      networkMagic,
    );
    const accountKeyOf = (accountIndex: number) =>
      accountIndex === currentAccountIndex
        ? extendedAccountPublicKey
        : extendedAccountPublicKeys?.[accountIndex];

    const budget = { probes: RECOVERY_PROBE_LIMIT };
    const found: FoundAccount[] = [];
    const unscannedVersions: CardanoCustodyUnscannedVersion[] = [];
    for (const version of SUPPORTED_CUSTODY_CONTRACT_VERSIONS) {
      const deviceAccountIndex = custodyDeviceAccountIndex(
        version,
        networkMagic,
      );
      const versionKey = accountKeyOf(deviceAccountIndex);
      if (!versionKey) {
        unscannedVersions.push({
          accountValidatorHash: version.accountValidatorHash,
          deviceAccountIndex,
        });
        continue;
      }
      const scanned = await scanVersion(wallet, {
        version,
        extendedAccountPublicKey: versionKey,
        startIndex,
        budget,
      });
      if (scanned.isErr()) return Err(scanned.error);
      found.push(...scanned.value);
    }

    const accounts: CardanoCustodyRecoveredAccount[] = [];
    for (const {
      creatorIndex,
      record,
      extendedAccountPublicKey: key,
    } of found) {
      const creator = await deriveCardanoCustodyDevice(key, creatorIndex);
      const { entity } = await createCardanoCustodyAccountEntity(wallet, {
        record,
        device: {
          extendedAccountPublicKey: key,
          index: creatorIndex,
          keyHash: creator.keyHash,
          channel,
        },
        name: name(creatorIndex),
      });
      await putCardanoCustodyAccount(wallet, entity);
      accounts.push({
        accountId: entity.accounts[0].accountId,
        creatorIndex,
        record,
      });
    }
    return Ok({ accounts, unscannedVersions });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
