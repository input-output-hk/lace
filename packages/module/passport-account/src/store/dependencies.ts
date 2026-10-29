import { Observable } from 'rxjs';

import { createAccount } from '../flows/create-account';
import { addDevice, removeDevice } from '../flows/devices';
import { issueGrant, revokeAllGrants, revokeGrant } from '../flows/grants';
import { readShieldedHoldings } from '../flows/holdings';
import { installOperations } from '../flows/install-operations';
import { signIn } from '../flows/sign-in';

import { createAccountRecordStore, toAccountRecords } from './account-record';

import type { CreatePassportAccountModuleProps } from '../create-passport-account-module';
import type {
  AccountRecordStore,
  SealedWithoutKeyOptions,
} from './account-record';
import type {
  CreateAccountInput,
  CreatedAccount,
} from '../flows/create-account';
import type {
  AddDeviceInput,
  DeviceCallInput,
  DeviceRoster,
} from '../flows/devices';
import type {
  GrantRoster,
  IssuedGrant,
  IssueGrantInput,
  RevokeGrantInput,
} from '../flows/grants';
import type { ReadHoldingsInput, ShieldedHoldings } from '../flows/holdings';
import type {
  InstalledOperations,
  InstallOperationsInput,
} from '../flows/install-operations';
import type { RecognisedAccount } from '../flows/sign-in';
import type {
  AccountCallInput,
  FlowContext,
  FlowProgress,
  FlowStage,
} from '../flows/types';
import type { PassportDependencies, SideEffect } from '@lace-contract/passport';

/** What a flow reports while it runs: each stage as entered, then its result. */
export type FlowEvent<T> =
  | { type: 'done'; result: T }
  | { type: 'progress'; stage: FlowStage };

/** The merged side-effect dependency bag a flow draws its seams and storage from. */
type FlowRunnerDependencies = Parameters<SideEffect>[2];

/**
 * The passport flows as the side effects consume them: streams of flow
 * events over the flows' promises. Module-private, declared onto the
 * side-effect dependencies by augmentation rather than by a contract.
 */
export interface PassportFlowDependencies {
  passportFlows: {
    createAccount: (
      input: CreateAccountInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<CreatedAccount>>;
    signIn: (
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<RecognisedAccount>>;
    addDevice: (
      input: AddDeviceInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<DeviceRoster>>;
    removeDevice: (
      input: DeviceCallInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<DeviceRoster>>;
    issueGrant: (
      input: IssueGrantInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<IssuedGrant>>;
    revokeGrant: (
      input: RevokeGrantInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<GrantRoster>>;
    revokeAllGrants: (
      input: AccountCallInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<GrantRoster>>;
    readShieldedHoldings: (
      input: ReadHoldingsInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<ShieldedHoldings>>;
    installOperations: (
      input: InstallOperationsInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<InstalledOperations>>;
  };
}

/**
 * Runs a flow as a cold stream of its events. `run` is invoked once per
 * subscription with a progress sink that emits synchronously as the flow
 * reports; the resolution emits 'done' and completes, and a rejection
 * errors the stream. Unsubscribing only stops delivery: the running
 * promise is not cancelled, because a flow must run to completion once
 * started (abandoning it mid-deploy could orphan a sponsored contract).
 */
const observeFlow = <T>(
  run: (onProgress: FlowProgress) => Promise<T>,
): Observable<FlowEvent<T>> =>
  new Observable<FlowEvent<T>>(subscriber => {
    let isDelivering = true;
    run(stage => {
      if (isDelivering) subscriber.next({ type: 'progress', stage });
    }).then(
      result => {
        if (!isDelivering) return;
        subscriber.next({ type: 'done', result });
        subscriber.complete();
      },
      (error: unknown) => {
        if (isDelivering) subscriber.error(error);
      },
    );
    return () => {
      isDelivering = false;
    };
  });

/**
 * What the host gives a flow context beyond the dependency bag: the
 * record store, when the host supplies its own, the relying party id,
 * when the host runs under one, and how a built store reads a sealed
 * record it has no key for.
 */
type FlowHost = SealedWithoutKeyOptions & {
  store?: AccountRecordStore;
  rpId: string | undefined;
};

/**
 * The context a flow runs under, drawn from the side-effect dependency
 * bag: the five seams, the record store and the relying party id. An
 * injected store is used as is; otherwise the store is built over the
 * platform storage and keyed by the authoriser, so a record sealed by one
 * authoriser is only ever written through it. The sealed-record options
 * apply to that built store; signIn and the grant flows pass
 * `onSealedWithoutKey: 'error'` so a sealed record found without a
 * storage key surfaces as record-unreadable rather than as an absent
 * account.
 */
const toFlowContext = (
  {
    createKeyValueStorage,
    passportAuthoriser,
    passportEncryptionKey,
    passportNetwork,
    passportProver,
    passportSponsor,
  }: FlowRunnerDependencies,
  onProgress: FlowProgress,
  { store, rpId, ...recordOptions }: FlowHost,
): FlowContext => ({
  seams: {
    passportAuthoriser,
    passportEncryptionKey,
    passportNetwork,
    passportProver,
    passportSponsor,
  },
  accountRecords: toAccountRecords(
    store ??
      createAccountRecordStore(
        createKeyValueStorage,
        passportAuthoriser.storageKey,
        recordOptions,
      ),
  ),
  onProgress,
  rpId,
});

/**
 * Maps the platform capabilities passed to `createPassportAccountModule`
 * onto the `passport-dependency` contract, and exposes the platform-neutral
 * flows observable-based. The flows are promise functions; wrapping them
 * here rather than in the side effects is what keeps promise handling out
 * of the side effects, so they compose the flows as plain streams and stay
 * testable on a virtual scheduler. The relying party id defaults to the
 * page's hostname, as the passkey ceremony's does.
 */
export const createDependencies = ({
  authoriser,
  encryptionKey,
  sponsor,
  prover,
  network,
  accountRecordStore,
  rpId = globalThis.location?.hostname,
}: CreatePassportAccountModuleProps): PassportDependencies &
  PassportFlowDependencies => {
  const host: FlowHost = { store: accountRecordStore, rpId };
  const recordRequired: FlowHost = { ...host, onSealedWithoutKey: 'error' };
  return {
    passportAuthoriser: authoriser,
    passportEncryptionKey: encryptionKey,
    passportSponsor: sponsor,
    passportProver: prover,
    passportNetwork: network,
    passportFlows: {
      createAccount: (input, dependencies) =>
        observeFlow(async onProgress =>
          createAccount(input, toFlowContext(dependencies, onProgress, host)),
        ),
      signIn: dependencies =>
        observeFlow(async onProgress =>
          signIn(toFlowContext(dependencies, onProgress, recordRequired)),
        ),
      addDevice: (input, dependencies) =>
        observeFlow(async onProgress =>
          addDevice(input, toFlowContext(dependencies, onProgress, host)),
        ),
      removeDevice: (input, dependencies) =>
        observeFlow(async onProgress =>
          removeDevice(input, toFlowContext(dependencies, onProgress, host)),
        ),
      issueGrant: (input, dependencies) =>
        observeFlow(async onProgress =>
          issueGrant(
            input,
            toFlowContext(dependencies, onProgress, recordRequired),
          ),
        ),
      revokeGrant: (input, dependencies) =>
        observeFlow(async onProgress =>
          revokeGrant(
            input,
            toFlowContext(dependencies, onProgress, recordRequired),
          ),
        ),
      revokeAllGrants: (input, dependencies) =>
        observeFlow(async onProgress =>
          revokeAllGrants(
            input,
            toFlowContext(dependencies, onProgress, recordRequired),
          ),
        ),
      readShieldedHoldings: (input, dependencies) =>
        observeFlow(async onProgress =>
          readShieldedHoldings(
            input,
            toFlowContext(dependencies, onProgress, host),
          ),
        ),
      installOperations: (input, dependencies) =>
        observeFlow(async onProgress =>
          installOperations(
            input,
            toFlowContext(dependencies, onProgress, host),
          ),
        ),
    },
  };
};
