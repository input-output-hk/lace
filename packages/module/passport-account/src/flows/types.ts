import type {
  PassportAccountInfo,
  PassportDependencies,
  PassportDevice,
} from '@lace-contract/passport';

/**
 * The locally persisted identity of a Passport account: enough to
 * recognise the account on a return visit without a passkey ceremony.
 * `localUseCounter` is the decimal string of this device's anti-replay
 * counter; it is stored as a string because the counter is a bigint on
 * chain. Key material is never part of this record.
 */
export type PassportAccountRecord = {
  address: string;
  bindingVersion: string;
  localUseCounter: string;
};

/**
 * The flow states a running flow reports as it enters them. 'ceremony' is
 * entered by the host before a flow starts, and 'ready' and 'error' are
 * derived by the host from how the flow's promise settles, so a flow
 * reports only the stages listed here.
 */
export type FlowStage = 'activating' | 'deploying' | 'proving' | 'sponsoring';

/** Receives each stage as the flow enters it, in order. */
export type FlowProgress = (stage: FlowStage) => void;

/**
 * The promise seam a flow persists the account record through. `read`
 * resolves undefined when nothing is stored, `exists` reports presence
 * without opening the record, and `write` resolves once the record is
 * durable.
 */
export type AccountRecords = {
  read: () => Promise<PassportAccountRecord | undefined>;
  write: (record: PassportAccountRecord) => Promise<void>;
  exists: () => Promise<boolean>;
};

/**
 * Everything a flow consumes: the platform seams, the record store, and
 * the progress sink. Nothing here knows about the store or its streams,
 * so a flow can run under any host that supplies these three.
 */
export type FlowContext = {
  seams: PassportDependencies;
  accountRecords: AccountRecords;
  onProgress: FlowProgress;
};

/**
 * What a flow leaves behind once an account is ready on this device: the
 * ready account, its device roster, and this device's use counter. Shared
 * by createAccount and signIn, whose results carry the same shape.
 */
export type FlowAccountState = {
  account: PassportAccountInfo;
  devices: PassportDevice[];
  localUseCounter: string;
};
