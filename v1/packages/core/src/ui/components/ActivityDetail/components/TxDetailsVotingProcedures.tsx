import React from 'react';
import { Wallet } from '@lace/cardano';
import { VotingProcedures } from '../../VotingProcedures';
import { TxDetailsGroup } from '../TxDetailsGroup';
import { useTranslation } from 'react-i18next';

interface TxDetailsVotingProceduresProps {
  explorerBaseUrl: string;
  votingProcedures: Wallet.Cardano.VotingProcedures;
  withSeparatorLine?: boolean;
}

export const TxDetailsVotingProcedures = ({
  votingProcedures,
  explorerBaseUrl,
  withSeparatorLine = true
}: TxDetailsVotingProceduresProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <TxDetailsGroup
      title={t('core.activityDetails.votingProcedures')}
      testId="voting-procedures"
      withSeparatorLine={withSeparatorLine}
    >
      <VotingProcedures
        data={votingProcedures.map((votingProcedure) =>
          Wallet.util.mapVotingProcedureToView(votingProcedure, explorerBaseUrl)
        )}
      />
    </TxDetailsGroup>
  );
};
