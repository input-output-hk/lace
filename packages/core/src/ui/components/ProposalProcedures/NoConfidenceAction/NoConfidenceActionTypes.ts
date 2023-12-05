import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/TransactionDetailsTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId?: ActionIdTypes.Data;
  governanceAction: ProcedureTypes.Procedure['governanceAction'];
  txDetails: TxDetailsTypes.TxDetails;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  governanceAction: ProcedureTypes.Translations['governanceAction'];
  txDetails: TxDetailsTypes.Translations;
}
