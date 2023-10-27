import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';

interface MembersToBeAdded {
  coldCredential: {
    hash: string;
  };
  epoch: string;
}

interface MembersToBeRemoved {
  hash: string;
}

interface NewQuorumThreshold {
  denominator: string;
  numerator: string;
}

export interface Data {
  procedure: ProcedureTypes.Procedure;
  actionId: ActionIdTypes.Data;
  membersToBeAdded: MembersToBeAdded[];
  membersToBeRemoved: MembersToBeRemoved[];
  newQuorumThreshold: NewQuorumThreshold;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId: ActionIdTypes.Translations;
  membersToBeAdded: {
    title: string;
    coldCredential: {
      hash: string;
      epoch: string;
    };
  };
  membersToBeRemoved: {
    title: string;
    hash: string;
  };
  newQuorumThreshold: {
    title: string;
    denominator: string;
    numerator: string;
  };
}
