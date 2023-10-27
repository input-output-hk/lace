import * as ProcedureTypes from '../components/ProcedureTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  withdrawals: Array<{
    rewardAccount: string;
    lovelace: string;
  }>;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  withdrawals: {
    title: string;
    rewardAccount: string;
    lovelace: string;
  };
}
