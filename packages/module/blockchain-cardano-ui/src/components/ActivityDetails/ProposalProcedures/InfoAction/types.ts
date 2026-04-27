import type * as ProcedureTypes from '../components/ProcedureTypes';
import type * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

export interface Data {
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  procedure: ProcedureTypes.Translations;
}
