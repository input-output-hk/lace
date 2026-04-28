import { useTranslation } from '@lace-contract/i18n';
import { Accordion } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ProposalProcedureAction } from './ProposalProcedures/ProposalProcedureAction';

import type { Cardano } from '@cardano-sdk/core';
import type { NetworkType } from '@lace-contract/network';

export const ActivityDetailsProposalProcedure = ({
  proposalProcedures,
  networkType,
}: {
  proposalProcedures: Cardano.ProposalProcedure[];
  networkType: NetworkType;
}) => {
  const { t } = useTranslation();
  return (
    <Accordion.Root title={t('v2.activity-details.sheet.proposalProcedures')}>
      {proposalProcedures.map(procedure => (
        <Accordion.AccordionContent
          key={`${procedure.governanceAction.__typename}__${procedure.anchor.dataHash}`}>
          <ProposalProcedureAction
            key={`${procedure.governanceAction.__typename}__${procedure.anchor.dataHash}`}
            proposalProcedure={procedure}
            networkType={networkType}
          />
        </Accordion.AccordionContent>
      ))}
    </Accordion.Root>
  );
};
