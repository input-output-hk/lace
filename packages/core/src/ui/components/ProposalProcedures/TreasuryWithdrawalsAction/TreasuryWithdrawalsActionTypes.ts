import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/TransactionDetailsTypes';

export interface Data {
  actionId?: ActionIdTypes.Data;
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
  withdrawals: Array<{
    rewardAccount: string;
    lovelace: string;
  }>;
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  procedure: ProcedureTypes.Translations;
  withdrawals: {
    title: string;
    rewardAccount: string;
    lovelace: string;
  };
}
