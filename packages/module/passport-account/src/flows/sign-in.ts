import {
  AccAddress,
  AccountContractMissingError,
  AccountNotFoundError,
  UseCounter,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import { ledger } from '../acc/acc-module';
import { resolveUseCounter } from '../acc/use-counter';
import { createIndexerClient } from '../infra/indexer';

import { inKeySession } from './key-session';

import type { FlowAccountState, FlowContext } from './types';
import type { PassportDevice } from '@lace-contract/passport';

/**
 * What a completed sign-in restores: the ready account, its whole device
 * roster with only this device marked local, and this device's healed use
 * counter.
 */
export type RecognisedAccount = FlowAccountState;

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
 * Recognises an existing Passport account on this device: the passkey
 * ceremony (implicit in the first authoriser use) proves the device key,
 * the persisted account record names the Account Custody Contract, the
 * indexer confirms the contract is live, and the use-counter rescan
 * restores this device's roster position from the on-chain device set. The
 * roster is rebuilt from every entry in that set, so a device enrolled
 * elsewhere survives a reload; only the local entry is named, the rest are
 * opaque commitments. The whole chain runs inside one key session, so it
 * costs a single ceremony rather than one per authoriser call.
 *
 * The healed counter is written back to the persisted record before this
 * resolves, so the next sign-in rescans from a fresh anchor instead of the
 * creation-time one. A missing record raises AccountNotFoundError, and a
 * record whose address holds no live contract raises
 * AccountContractMissingError; rediscovering an account by name service
 * when no record is persisted is a separate flow and out of scope here.
 *
 * signIn reports no intermediate stage: the ceremony, the indexer read and
 * the rescan all settle before there is anything to report.
 */
export const signIn = async ({
  seams,
  accountRecords,
}: FlowContext): Promise<RecognisedAccount> => {
  const { passportAuthoriser, passportNetwork } = seams;

  return inKeySession(passportAuthoriser, async () => {
    await passportAuthoriser.devicePublicKey();
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
    const { useCounter, commitmentHex } = await resolveUseCounter({
      ledgerState,
      authoriser: passportAuthoriser,
      address: AccAddress(record.address),
      knownUseCounter: UseCounter(BigInt(record.localUseCounter)),
    });
    const devices = toDeviceRoster(ledgerState.devices, commitmentHex);
    const localUseCounter = useCounter.toString();
    await accountRecords.write({ ...record, localUseCounter });
    return {
      account: {
        address: record.address,
        bindingVersion: record.bindingVersion,
        status: 'ready',
      },
      devices,
      localUseCounter,
    };
  });
};
