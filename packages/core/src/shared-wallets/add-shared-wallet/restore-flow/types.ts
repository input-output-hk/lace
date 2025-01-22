import { CoSigner, QuorumOptionValue } from '../creation-flow';

export enum SharedWalletRestorationStep {
  Done = 'Done',
  Import = 'Import',
}

export type CreateWalletParams = {
  coSigners: CoSigner[];
  name: string;
  quorumRules: QuorumOptionValue | null;
};
