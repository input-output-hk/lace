import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId: ActionIdTypes.Data;
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
  actionId: ActionIdTypes.Translations;
  constitution: {
    title: string;
    anchor: {
      dataHash: string;
      url: string;
    };
    scriptHash: string;
  };
}
