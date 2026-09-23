import {
  AccAddress,
  AccountExistsError,
  DeviceEpoch,
  UseCounter,
} from '@lace-contract/passport';

import { deployAccount } from '../acc/deploy';
import { generateEncKeyPair } from '../acc/enc-keys';
import { accManifest } from '../acc/manifest';
import { createMidnightProviders } from '../infra/providers';

import { inKeySession } from './key-session';

import type { FlowAccountState, FlowContext } from './types';

/** The initial device entry is inserted at epoch 0 with use counter 0. */
const INITIAL_DEVICE_EPOCH = DeviceEpoch(0n);
const INITIAL_USE_COUNTER = UseCounter(0n);
const INITIAL_USE_COUNTER_VALUE = '0';

/** The caller's choices for a new account. */
export type CreateAccountInput = {
  /**
   * Whether to retire the contract maintenance authority once activation
   * completes; see {@link deployAccount} for what each choice trades.
   */
  lockAccount: boolean;
};

/**
 * What a completed creation leaves behind: the ready account, a roster
 * holding only this device, and this device's initial use counter.
 */
export type CreatedAccount = FlowAccountState;

/**
 * Creates a Passport account: the passkey ceremony (implicit in the first
 * authoriser use), the Account Custody Contract deployment with sponsored
 * fees, the initial device activation, and the local persistence of the
 * account record. Every step runs inside one key session, so the whole
 * flow costs a single ceremony rather than one per authoriser call.
 *
 * Progress is reported through `onProgress`: 'deploying' once the
 * authoriser has produced the device key, 'proving' and 'sponsoring' from
 * inside each transaction submission (a transaction proves first, then
 * the sponsor balances it), and 'activating' before the activation call.
 * The record is written before the promise resolves, so a process that
 * dies right after still recognises the account on next startup.
 *
 * The flow runs to completion once started: cancelling mid-deploy could
 * orphan a contract the sponsor already paid for. The caller's flow gate
 * is what keeps a second request from starting one.
 *
 * A device already holding an account record refuses with
 * AccountExistsError before the ceremony runs: the record is the only
 * pointer to the deployed contract and there is no recovery path, so
 * creating over it would orphan the existing account. Presence is
 * checked without opening the record, so a sealed record blocks the flow
 * without costing a prompt.
 */
export const createAccount = async (
  { lockAccount }: CreateAccountInput,
  { seams, accountRecords, onProgress }: FlowContext,
): Promise<CreatedAccount> => {
  if (await accountRecords.exists()) {
    throw new AccountExistsError();
  }
  const {
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  } = seams;

  return inKeySession(passportAuthoriser, async () => {
    await passportAuthoriser.devicePublicKey();
    onProgress('deploying');
    const providers = await createMidnightProviders({
      network: passportNetwork,
      prover: passportProver,
      sponsor: passportSponsor,
      onStage: onProgress,
    });
    const deployed = await deployAccount({
      providers,
      authoriser: passportAuthoriser,
      encKeyPair: generateEncKeyPair(),
      lockAccount,
    });
    onProgress('activating');
    await deployed.activate();
    const commitmentHex = await passportAuthoriser.deviceCommitment(
      AccAddress(deployed.address),
      INITIAL_DEVICE_EPOCH,
      INITIAL_USE_COUNTER,
    );
    await accountRecords.write({
      address: deployed.address,
      bindingVersion: accManifest.bindingVersion,
      localUseCounter: INITIAL_USE_COUNTER_VALUE,
    });
    return {
      account: {
        address: deployed.address,
        bindingVersion: accManifest.bindingVersion,
        status: 'ready',
      },
      devices: [{ commitmentHex, isLocal: true }],
      localUseCounter: INITIAL_USE_COUNTER_VALUE,
    };
  });
};
