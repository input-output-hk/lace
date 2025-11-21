import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

export interface Data {
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
  actionId?: ActionIdTypes.Data;
  protocolVersion: {
    major: string;
    minor: string;
    patch?: string;
  };
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  procedure: ProcedureTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  protocolVersion: {
    major: string;
    minor: string;
    patch: string;
  };
}
