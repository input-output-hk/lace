import { Observable } from 'rxjs';

import { createAccount } from '../flows/create-account';
import { addDevice, removeDevice } from '../flows/devices';
import { signIn } from '../flows/sign-in';

import { createAccountRecordStore, toAccountRecords } from './account-record';

import type { CreatePassportAccountModuleProps } from '../create-passport-account-module';
import type { SealedWithoutKeyOptions } from './account-record';
import type {
  CreateAccountInput,
  CreatedAccount,
} from '../flows/create-account';
import type { DeviceCallInput, DeviceRoster } from '../flows/devices';
import type { RecognisedAccount } from '../flows/sign-in';
import type { FlowContext, FlowProgress, FlowStage } from '../flows/types';
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
      input: DeviceCallInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<DeviceRoster>>;
    removeDevice: (
      input: DeviceCallInput,
      dependencies: FlowRunnerDependencies,
    ) => Observable<FlowEvent<DeviceRoster>>;
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
 * The context a flow runs under, drawn from the side-effect dependency
 * bag: the four seams and a record store keyed by the authoriser, so a
 * record sealed by one authoriser is only ever written through it.
 * `recordOptions` is forwarded to the record store; signIn passes
 * `onSealedWithoutKey: 'error'` so a sealed record found without a
 * storage key surfaces as record-unreadable rather than as an absent
 * account.
 */
const toFlowContext = (
  {
    createKeyValueStorage,
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  }: FlowRunnerDependencies,
  onProgress: FlowProgress,
  recordOptions?: SealedWithoutKeyOptions,
): FlowContext => ({
  seams: {
    passportAuthoriser,
    passportNetwork,
    passportProver,
    passportSponsor,
  },
  accountRecords: toAccountRecords(
    createAccountRecordStore(
      createKeyValueStorage,
      passportAuthoriser.storageKey,
      recordOptions,
    ),
  ),
  onProgress,
});

/**
 * Maps the platform capabilities passed to `createPassportAccountModule`
 * onto the `passport-dependency` contract, and exposes the platform-neutral
 * flows observable-based. The flows are promise functions; wrapping them
 * here rather than in the side effects is what keeps promise handling out
 * of the side effects, so they compose the flows as plain streams and stay
 * testable on a virtual scheduler.
 */
export const createDependencies = ({
  authoriser,
  sponsor,
  prover,
  network,
}: CreatePassportAccountModuleProps): PassportDependencies &
  PassportFlowDependencies => ({
  passportAuthoriser: authoriser,
  passportSponsor: sponsor,
  passportProver: prover,
  passportNetwork: network,
  passportFlows: {
    createAccount: (input, dependencies) =>
      observeFlow(async onProgress =>
        createAccount(input, toFlowContext(dependencies, onProgress)),
      ),
    signIn: dependencies =>
      observeFlow(async onProgress =>
        signIn(
          toFlowContext(dependencies, onProgress, {
            onSealedWithoutKey: 'error',
          }),
        ),
      ),
    addDevice: (input, dependencies) =>
      observeFlow(async onProgress =>
        addDevice(input, toFlowContext(dependencies, onProgress)),
      ),
    removeDevice: (input, dependencies) =>
      observeFlow(async onProgress =>
        removeDevice(input, toFlowContext(dependencies, onProgress)),
      ),
  },
});
