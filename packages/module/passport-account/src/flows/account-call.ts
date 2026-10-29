import {
  AccAddress,
  AccountContractMissingError,
  DeviceEpoch,
  UseCounter,
} from '@lace-contract/passport';

import { ledger } from '../acc/acc-module';
import { connectAccountHandle, executeGatedCall } from '../acc/gated-call';
import { createIndexerClient } from '../infra/indexer';
import { createMidnightProviders } from '../infra/providers';

import type { Ledger } from '../acc/acc-module';
import type { AccProvingCircuitName } from '../acc/manifest';
import type { IndexerClient } from '../infra/indexer';
import type { MidnightProviderStage } from '../infra/providers';
import type {
  PassportAccountInfo,
  PassportDependencies,
  PassportDevice,
  PassportNetworkConfig,
} from '@lace-contract/passport';

/** Contract aborts meaning the authorising key was rejected. */
const NOT_AUTHORISED_ABORTS = [
  'failed assert: invalid signature',
  'failed assert: device key',
];

/**
 * Raised by the caller checks in require_authorised and by the target
 * check in _do_remove_device: the same string for two different failures.
 */
export const UNKNOWN_ENTRY_ABORT = 'failed assert: unknown device entry';

/** Whether a contract abort message says the authorising key was rejected. */
export const isNotAuthorisedAbort = (message: string): boolean =>
  NOT_AUTHORISED_ABORTS.some(abort => message.includes(abort));

/** What the local device holds once the contract accepted a gated call. */
export type AcceptedAccountCall = {
  advancedCounter: UseCounter;
  localCommitmentHex: string;
};

/** The account's ledger state as the indexer serves it, with the client that read it. */
export type AccountLedger = {
  indexer: IndexerClient;
  ledgerState: Ledger;
};

/**
 * The contract state the indexer serves at `address`, which must exist.
 *
 * @throws {@link AccountContractMissingError} when the indexer serves no
 * contract at the address.
 */
const queryAccountState = async (indexer: IndexerClient, address: string) => {
  const state = await indexer.queryContractState(address);
  if (!state) {
    throw new AccountContractMissingError(
      `No live Account Custody Contract found at ${address}.`,
    );
  }
  return state;
};

/**
 * The decoded ledger state of the account at `address`, which must hold
 * a live contract.
 *
 * @throws {@link AccountContractMissingError} when the indexer serves no
 * contract at the address.
 */
export const queryAccountLedger = async (
  indexer: IndexerClient,
  address: string,
): Promise<Ledger> => ledger((await queryAccountState(indexer, address)).data);

/**
 * The operations the account at `address` holds verifier keys for, which
 * are the circuits the chain will accept a call to.
 *
 * @throws {@link AccountContractMissingError} when the indexer serves no
 * contract at the address.
 */
export const queryAccountOperations = async (
  indexer: IndexerClient,
  address: string,
): Promise<readonly string[]> =>
  (await queryAccountState(indexer, address)).operations().map(String);

/**
 * Reads the account's ledger state through a fresh indexer client, which
 * is returned with it so a flow can read the state again after a call.
 */
export const readAccountLedger = async (
  address: string,
  { indexerUrl, indexerWsUrl }: PassportNetworkConfig,
): Promise<AccountLedger> => {
  const indexer = createIndexerClient({ indexerUrl, indexerWsUrl });
  return { indexer, ledgerState: await queryAccountLedger(indexer, address) };
};

export type SubmitAccountCallProps = {
  /** Gated circuit the call targets. */
  circuit: AccProvingCircuitName;
  /** The circuit's own arguments in declaration order. */
  args: readonly unknown[];
  account: PassportAccountInfo;
  localUseCounter: string | undefined;
  /** Ledger state read before the call, so the signature binds its auth nonce. */
  ledgerState: Ledger;
  /** Told as the transaction enters proving and sponsoring, when given. */
  onStage?: (stage: MidnightProviderStage) => void;
};

/**
 * Submits one gated call and reports the position it left the local
 * device in. The handle is connected without the account encryption
 * secret: the device and grant lifecycle circuits read no private state,
 * so deriving it here would only widen the window the secret spends in
 * memory. The successor commitment is computed against the epoch read
 * before the call, which is the epoch the accepted call ran under: a
 * gated call never changes device_epoch (it is only written at
 * construction), so the pre-call epoch names the very entry the contract
 * inserted.
 */
export const submitAccountCall = async (
  {
    circuit,
    args,
    account,
    localUseCounter,
    ledgerState,
    onStage,
  }: SubmitAccountCallProps,
  {
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  }: PassportDependencies,
): Promise<AcceptedAccountCall> => {
  const providers = await createMidnightProviders({
    network: passportNetwork,
    prover: passportProver,
    sponsor: passportSponsor,
    ...(onStage ? { onStage } : {}),
  });
  const handle = await connectAccountHandle(providers, account.address);
  const address = AccAddress(account.address);
  const advancedCounter = await executeGatedCall({
    handle,
    authoriser: passportAuthoriser,
    circuit,
    args,
    address,
    ledgerState,
    knownUseCounter:
      localUseCounter === undefined
        ? undefined
        : UseCounter(BigInt(localUseCounter)),
  });
  return {
    advancedCounter,
    localCommitmentHex: await passportAuthoriser.deviceCommitment(
      address,
      DeviceEpoch(ledgerState.device_epoch),
      advancedCounter,
    ),
  };
};

/**
 * The devices list with the local device's row moved to the commitment it
 * holds after an accepted call. An entry is single use: the call consumed
 * the one the row carried and the contract inserted its successor, so
 * leaving the row as it was would name an entry the on-chain set no
 * longer holds. Only existing rows are rewritten, so a removal that
 * dropped the local row does not resurrect it.
 */
export const withRefreshedLocalDevice = (
  devices: PassportDevice[],
  commitmentHex: string,
): PassportDevice[] =>
  devices.map(device =>
    device.isLocal ? { ...device, commitmentHex } : device,
  );
