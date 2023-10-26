import React from 'react';
import { Cell, Metadata, Text, sx } from '@lace/ui';
import * as Types from './ParameterChangeActionTypes';
import { Card } from '../components/Card';
import decamelizeKeys from 'decamelize-keys';
import titleize from 'titleize';

interface Props {
  governanceGroup: Types.GovernanceGroup;
  translations: Types.Translations['governanceGroup'];
}

export const GovernanceGroup = ({ governanceGroup, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  const dRepVotingThresholds = decamelizeKeys(governanceGroup.dRepVotingThresholds, { separator: ' ' });

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
          data={Object.entries(dRepVotingThresholds).map(([label, value]) => ({
            label: titleize(label),
            value
          }))}
        />
      </Cell>
    </>
  );
};
