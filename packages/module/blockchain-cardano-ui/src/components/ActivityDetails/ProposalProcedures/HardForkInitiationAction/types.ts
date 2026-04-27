import type * as ActionIdTypes from '../components/ActionIdTypes';
import type * as ProcedureTypes from '../components/ProcedureTypes';
import type * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

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
