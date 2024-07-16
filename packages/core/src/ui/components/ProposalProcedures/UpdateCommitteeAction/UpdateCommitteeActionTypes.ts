import * as ProcedureTypes from '../components/ProcedureTypes';
import * as ActionIdTypes from '../components/ActionIdTypes';
import * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

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
  actionId?: ActionIdTypes.Data;
  txDetails: TxDetailsTypes.TxDetails;
  procedure: ProcedureTypes.Procedure;
  membersToBeAdded: MembersToBeAdded[];
  membersToBeRemoved: MembersToBeRemoved[];
  newQuorumThreshold?: NewQuorumThreshold;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  actionId?: ActionIdTypes.Translations;
  txDetails: TxDetailsTypes.Translations;
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
  newQuorumThreshold?: {
    title: string;
    denominator: string;
    numerator: string;
  };
}
