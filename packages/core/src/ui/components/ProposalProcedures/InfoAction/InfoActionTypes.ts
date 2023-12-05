import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/TransactionDetailsTypes';
export interface Data {
  txDetails: TxDetailsTypes.TxDetails;
  actionId?: ActionIdTypes.Data;
  procedure: ProcedureTypes.Procedure;
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  procedure: ProcedureTypes.Translations;
}
