import React from 'react';
import { Cell, Metadata, Text, sx } from '@lace/ui';
import * as Types from './ParameterChangeActionTypes';
import { Card } from '../components/Card';

interface Props {
  governanceGroup: Types.GovernanceGroup;
  translations: Types.Translations['governanceGroup'];
}

export const GovernanceGroup = ({ governanceGroup, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  return (
    <>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.title}
        </Text.Body.Large>
      </Cell>
      <Cell>
        <Metadata
          label="Gov Act Lifetime"
          tooltip={translations.tooltip.govActionLifetime}
          text={governanceGroup.govActionLifetime}
        />
      </Cell>
      <Cell>
        <Metadata
          label="Gov Act Deposit"
          tooltip={translations.tooltip.govActionDeposit}
          text={governanceGroup.govActionDeposit}
        />
      </Cell>
      <Cell>
        <Metadata label="DRep Deposit" tooltip={translations.tooltip.drepDeposit} text={governanceGroup.drepDeposit} />
      </Cell>
      <Cell>
        <Metadata
          label="DRep Activity"
          tooltip={translations.tooltip.drepActivity}
          text={governanceGroup.drepActivity}
        />
      </Cell>
      <Cell>
        <Metadata label="CC Min Size" tooltip={translations.tooltip.ccMinSize} text={governanceGroup.ccMinSize} />
      </Cell>
      <Cell>
        <Metadata
          label="CC Max Term Length"
          tooltip={translations.tooltip.ccMaxTermLength}
          text={governanceGroup.ccMaxTermLength}
        />
      </Cell>
      <Cell>
        <Card
          title="DRep Voting Thresholds"
          tooltip={translations.tooltip.dRepVotingThresholds.title}
          data={[
            {
              label: 'DVT Motion No Confidence',
              value: governanceGroup.dRepVotingThresholds.dvtMotionNoConfidence
            },
            {
              label: 'DVT Committee Normal',
              value: governanceGroup.dRepVotingThresholds.dvtCommitteeNormal
            },
            {
              label: 'DVT Committee No Confidence',
              value: governanceGroup.dRepVotingThresholds.dvtCommitteeNoConfidence
            },
            {
              label: 'DVT Update To Constitution',
              value: governanceGroup.dRepVotingThresholds.dvtUpdateToConstitution
            },
            {
              label: 'DVT Hard Fork Initiation',
              value: governanceGroup.dRepVotingThresholds.dvtHardForkInitiation
            },
            {
              label: 'DVT PP Network Group',
              value: governanceGroup.dRepVotingThresholds.dvtPPNetworkGroup
            },
            {
              label: 'DVT PP Economic Group',
              value: governanceGroup.dRepVotingThresholds.dvtPPEconomicGroup
            },
            {
              label: 'DVT PP Technical Group',
              value: governanceGroup.dRepVotingThresholds.dvtPPTechnicalGroup
            },
            {
              label: 'DVT PP Gov Group',
              value: governanceGroup.dRepVotingThresholds.dvtPPGovGroup
            },
            {
              label: 'DVT Treasury Withdrawal',
              value: governanceGroup.dRepVotingThresholds.dvtTreasuryWithdrawal
            }
          ]}
        />
      </Cell>
    </>
  );
};
