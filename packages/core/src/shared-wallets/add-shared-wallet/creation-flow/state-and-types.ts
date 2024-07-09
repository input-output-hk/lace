import { defineStateShape } from '../../state-utils';
import { CoSigner, CoSignerDirty, CoSignerError } from './AddCoSigners';
import { QuorumOptionValue } from './Quorum';

export enum SharedWalletCreationStep {
  CoSigners = 'CoSigners',
  CoSignersImportantInfo = 'CoSignersImportantInfo',
  Quorum = 'Quorum',
  Setup = 'Setup',
  ShareDetails = 'ShareDetails',
}

export const makeState = defineStateShape<{
  constantDataPart: {
    activeWalletName: string;
  };
  mainPart: {
    step: SharedWalletCreationStep;
  };
  variableDataPart: {
    coSignerInputsDirty: CoSignerDirty[];
    coSignerInputsErrors: CoSignerError[];
    coSigners: CoSigner[];
    quorumRules: QuorumOptionValue;
    walletName: string;
  };
}>();

export const stateSetup = makeState<{
  coSignerInputsDirty: undefined;
  coSignerInputsErrors: undefined;
  coSigners: undefined;
  quorumRules: undefined;
  step: SharedWalletCreationStep.Setup;
  walletName: string | undefined;
}>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StateType<T extends (state: any) => any> = ReturnType<T>;

export type StateSetup = StateType<typeof stateSetup>;

type StateCoSignersCommon = {
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: undefined;
  walletName: string;
};

export const stateCoSigners = makeState<
  StateCoSignersCommon & {
    step: SharedWalletCreationStep.CoSigners;
  }
>();
export type StateCoSigners = StateType<typeof stateCoSigners>;

export const stateCoSignersImportantInfo = makeState<
  StateCoSignersCommon & {
    step: SharedWalletCreationStep.CoSignersImportantInfo;
  }
>();
export type StateCoSignersImportantInfo = StateType<typeof stateCoSignersImportantInfo>;

export const stateQuorum = makeState<{
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.Quorum;
  walletName: string;
}>();
export type StateQuorum = StateType<typeof stateQuorum>;

export const stateShareDetails = makeState<{
  coSignerInputsDirty: CoSignerDirty[];
  coSignerInputsErrors: CoSignerError[];
  coSigners: CoSigner[];
  quorumRules: QuorumOptionValue;
  step: SharedWalletCreationStep.ShareDetails;
  walletName: string;
}>();
export type StateShareDetails = StateType<typeof stateShareDetails>;

export type CreationFlowState =
  | StateSetup
  | StateCoSigners
  | StateCoSignersImportantInfo
  | StateQuorum
  | StateShareDetails;
