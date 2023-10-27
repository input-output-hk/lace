import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionTypes from '../components/ActionIdTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId: ActionTypes.Data;
  protocolVersion: {
    major: number;
    minor: number;
    patch: number;
  };
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId: ActionTypes.Translations;
  protocolVersion: {
    title: string;
    label: string;
  };
}
