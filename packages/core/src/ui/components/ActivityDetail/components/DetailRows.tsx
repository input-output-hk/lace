/* eslint-disable react/no-multi-comp, sonarjs/no-identical-functions */

import React from 'react';
import { DetailRow } from './DetailRow';
import { TxDetails } from '../types';
import { TranslationsFor } from '@src/ui/utils/types';

type DetailRowsCertificatesProps = {
  list: TxDetails<
    'certificateType' | 'drep' | 'anchor' | 'coldCredential' | 'hotCredential' | 'drepCredential' | 'depositPaid'
  >;
  testId: string;
  translations: TranslationsFor<
    'certificateType' | 'drep' | 'anchor' | 'coldCredential' | 'hotCredential' | 'drepCredential' | 'depositPaid'
  >;
};

export const DetailRowsCertificates = ({
  list,
  testId,
  translations
}: DetailRowsCertificatesProps): React.ReactElement => (
  <>
    {list.map(({ title, details }) => (
      <DetailRow
        key={`${testId}-${title}`}
        data-testid={`${testId}-${title}`}
        title={translations[title]}
        details={details}
      />
    ))}
  </>
);

type DetailRowsVotesProps = {
  list: TxDetails<'voterType' | 'voterCredential' | 'vote' | 'anchor' | 'proposalTxHash'>;
  testId: string;
  translations: TranslationsFor<'voterType' | 'voterCredential' | 'vote' | 'anchor' | 'proposalTxHash'>;
};

export const DetailRowsVotes = ({ list, testId, translations }: DetailRowsVotesProps): React.ReactElement => (
  <>
    {list.map(({ title, details }) => (
      <DetailRow
        key={`${testId}-${title}`}
        data-testid={`${testId}-${title}`}
        title={translations[title]}
        details={details}
      />
    ))}
  </>
);

type DetailRowsProposalsProps = {
  list: TxDetails<
    | 'type'
    | 'governanceActionId'
    | 'rewardAccount'
    | 'anchor'
    | 'protocolParamUpdate'
    | 'protocolVersion'
    | 'withdrawals'
    | 'membersToBeRemoved'
    | 'membersToBeAdded'
    | 'newQuorumThreshold'
    | 'constitutionAnchor'
  >;
  testId: string;
  translations: TranslationsFor<
    | 'type'
    | 'governanceActionId'
    | 'rewardAccount'
    | 'anchor'
    | 'protocolParamUpdate'
    | 'protocolVersion'
    | 'withdrawals'
    | 'membersToBeRemoved'
    | 'membersToBeAdded'
    | 'newQuorumThreshold'
    | 'constitutionAnchor'
  >;
};

export const DetailRowsProposals = ({ list, testId, translations }: DetailRowsProposalsProps): React.ReactElement => (
  <>
    {list.map(({ title, details }) => (
      <DetailRow
        key={`${testId}-${title}`}
        data-testid={`${testId}-${title}`}
        title={translations[title]}
        details={details}
      />
    ))}
  </>
);
