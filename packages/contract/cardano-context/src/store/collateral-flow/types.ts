import type {
  FeeEntry,
  TxErrorTranslationKeys,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { ErrorObject, StateObject } from '@lace-lib/util-store';

export type StateIdle = StateObject<'Idle'>;

export type StateRequested = StateObject<
  'Requested',
  {
    accountId: AccountId;
    wallet: AnyWallet;
  }
>;

export type StateBuilding = StateObject<
  'Building',
  {
    accountId: AccountId;
    wallet: AnyWallet;
  }
>;

export type StateReady = StateObject<
  'Ready',
  {
    accountId: AccountId;
    fees?: FeeEntry[];
    serializedTx?: string;
    txKey?: string;
    wallet: AnyWallet;
  }
>;

export type StateNotEnoughBalance = StateObject<
  'NotEnoughBalance',
  {
    accountId: AccountId;
  }
>;

export type StateConfirming = StateObject<
  'Confirming',
  {
    accountId: AccountId;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type StateSettingUnspendable = StateObject<
  'SettingUnspendable',
  {
    accountId: AccountId;
    txKey: string;
  }
>;

export type StateSubmitting = StateObject<
  'Submitting',
  {
    accountId: AccountId;
    fees: FeeEntry[];
    serializedTx: string;
    wallet: AnyWallet;
  }
>;

export type StateAwaitingUtxo = StateObject<
  'AwaitingUtxo',
  {
    accountId: AccountId;
    txId: string;
    wallet: AnyWallet;
  }
>;

export type StateSet = StateObject<
  'Set',
  {
    accountId: AccountId;
    txKey: string;
  }
>;

export type StateFailure = StateObject<
  'Failure',
  {
    accountId?: AccountId;
    error?: ErrorObject;
    errorTranslationKeys?: TxErrorTranslationKeys;
    fees?: FeeEntry[];
    serializedTx?: string;
    wallet?: AnyWallet;
  }
>;

export type StateDiscardingTx = StateObject<
  'DiscardingTx',
  {
    serializedTx: string;
  }
>;

export type StateReclaiming = StateObject<
  'Reclaiming',
  {
    accountId: AccountId;
    txKey: string;
  }
>;

export type CollateralFlowSliceState =
  | StateAwaitingUtxo
  | StateBuilding
  | StateConfirming
  | StateDiscardingTx
  | StateFailure
  | StateIdle
  | StateNotEnoughBalance
  | StateReady
  | StateReclaiming
  | StateRequested
  | StateSet
  | StateSettingUnspendable
  | StateSubmitting;
