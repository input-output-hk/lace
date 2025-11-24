import React from 'react';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { ProposalProcedureAction } from './ProposalProcedureAction';
import { TxDetailsGroup } from '../../TxDetailsGroup';

interface TxDetailsProposalProceduresProps {
  proposalProcedures: Wallet.Cardano.ProposalProcedure[];
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}

export const TxDetailsProposalProcedures = ({
  proposalProcedures,
  cardanoCoin,
  explorerBaseUrl
}: TxDetailsProposalProceduresProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <TxDetailsGroup title={t('core.activityDetails.proposalProcedures')} testId="proposal-procedures" withSeparatorLine>
      {proposalProcedures.map((procedure) => (
        <ProposalProcedureAction
          key={`${procedure.governanceAction.__typename}__${procedure.anchor.dataHash}`}
          proposalProcedure={procedure}
          cardanoCoin={cardanoCoin}
          explorerBaseUrl={explorerBaseUrl}
        />
      ))}
    </TxDetailsGroup>
  );
};
