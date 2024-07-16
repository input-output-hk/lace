import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId?: ActionIdTypes.Data;
  txDetails: TxDetailsTypes.TxDetails;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  txDetails: TxDetailsTypes.Translations;
}
