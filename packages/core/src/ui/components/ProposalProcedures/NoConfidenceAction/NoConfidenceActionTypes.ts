import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId: ActionIdTypes.Data;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId: ActionIdTypes.Translations;
}
