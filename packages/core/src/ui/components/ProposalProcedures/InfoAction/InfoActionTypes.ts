import * as ProcedureTypes from '../components/ProcedureTypes';
import * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';
export interface Data {
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  procedure: ProcedureTypes.Translations;
}
