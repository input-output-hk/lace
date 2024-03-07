import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { InfoAction } from '@lace/core';
import { SignTxData } from '../types';
import { useCexplorerBaseUrl } from '../hooks';

interface Props {
  dappInfo: SignTxData['dappInfo'];
  anchor: Wallet.Cardano.ProposalProcedure['anchor'];
  errorMessage?: string;
}

export const InfoActionContainer = ({ dappInfo, anchor, errorMessage }: Props): React.ReactElement => {
  const { t } = useTranslation();

  const explorerBaseUrl = useCexplorerBaseUrl();

  const translations = useMemo<Parameters<typeof InfoAction>[0]['translations']>(
    () => ({
      txDetails: {
        title: t('core.ProposalProcedure.txDetails.title'),
        txType: t('core.ProposalProcedure.txDetails.txType')
      },
      procedure: {
        title: t('core.ProposalProcedure.procedure.title'),
        anchor: {
          url: t('core.ProposalProcedure.procedure.anchor.url'),
          hash: t('core.ProposalProcedure.procedure.anchor.hash')
        }
      }
    }),
    [t]
  );

  const data: Parameters<typeof InfoAction>[0]['data'] = {
    txDetails: {
      txType: t('core.ProposalProcedure.governanceAction.infoAction.title')
    },
    procedure: {
      anchor: {
        url: anchor.url,
        hash: anchor.dataHash,
        txHashUrl: `${explorerBaseUrl}/${anchor.dataHash}`
      }
    }
  };

  return <InfoAction dappInfo={dappInfo} errorMessage={errorMessage} data={data} translations={translations} />;
};
