import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { InfoAction, getInfoActionViewData } from '@lace/core';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
}

export const InfoActionContainer = ({ anchor }: Props): React.ReactElement => {
  const explorerBaseUrl = useCexplorerBaseUrl();

  const data = useMemo(() => getInfoActionViewData({ anchor, explorerBaseUrl }), [anchor, explorerBaseUrl]);

  return <InfoAction data={data} />;
};
