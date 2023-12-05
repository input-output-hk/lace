import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/TransactionDetailsTypes';

export interface Data {
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
  governanceAction: ProcedureTypes.Procedure['governanceAction'];
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
  governanceAction: ProcedureTypes.Translations['governanceAction'];
  actionId?: ActionIdTypes.Translations;
  protocolVersion: {
    major: string;
    minor: string;
    patch: string;
  };
}
