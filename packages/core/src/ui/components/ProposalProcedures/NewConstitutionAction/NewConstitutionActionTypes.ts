import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/TransactionDetailsTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId?: ActionIdTypes.Data;
  txDetails: TxDetailsTypes.TxDetails;
  constitution: {
    anchor: {
      dataHash: string;
      url: string;
    };
    scriptHash: string;
  };
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  txDetails: TxDetailsTypes.Translations;
  constitution: {
    title: string;
    anchor: {
      dataHash: string;
      url: string;
    };
    scriptHash: string;
  };
}
