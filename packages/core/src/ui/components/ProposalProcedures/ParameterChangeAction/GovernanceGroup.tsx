/* eslint-disable complexity, sonarjs/cognitive-complexity */
import React from 'react';
import { Metadata, Text, sx, Divider, Cell } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './ParameterChangeActionTypes';

interface Props {
  governanceGroup?: Types.DeepPartial<Types.GovernanceGroup>;
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
      {governanceGroup?.govActionLifetime && (
        <Cell>
          <Metadata
            label={translations.govActionLifetime}
            tooltip={translations.tooltip.govActionLifetime}
            text={governanceGroup.govActionLifetime}
          />
        </Cell>
      )}
      {governanceGroup?.govActionDeposit && (
        <Cell>
          <Metadata
            label={translations.govActionDeposit}
            tooltip={translations.tooltip.govActionDeposit}
            text={governanceGroup.govActionDeposit}
          />
        </Cell>
      )}
      {governanceGroup?.drepDeposit && (
        <Cell>
          <Metadata
            label={translations.drepDeposit}
            tooltip={translations.tooltip.drepDeposit}
            text={governanceGroup.drepDeposit}
          />
        </Cell>
      )}
      {governanceGroup?.drepActivity && (
        <Cell>
          <Metadata
            label={translations.drepActivity}
            tooltip={translations.tooltip.drepActivity}
            text={governanceGroup.drepActivity}
          />
        </Cell>
      )}
      {governanceGroup?.ccMinSize && (
        <Cell>
          <Metadata
            label={translations.ccMinSize}
            tooltip={translations.tooltip.ccMinSize}
            text={governanceGroup.ccMinSize}
          />
        </Cell>
      )}
      {governanceGroup?.ccMaxTermLength && (
        <Cell>
          <Metadata
            label={translations.ccMaxTermLength}
            tooltip={translations.tooltip.ccMaxTermLength}
            text={governanceGroup.ccMaxTermLength}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds && (
        <>
          <Cell>
            <Divider my={'$16'} />
          </Cell>
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.dRepVotingThresholds.title}
            </Text.Body.Large>
          </Cell>
        </>
      )}
      {governanceGroup?.dRepVotingThresholds?.motionNoConfidence && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.motionNoConfidence}
            tooltip={translations.tooltip.dRepVotingThresholds.motionNoConfidence}
            text={governanceGroup.dRepVotingThresholds.motionNoConfidence}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.committeeNormal && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.committeeNormal}
            tooltip={translations.tooltip.dRepVotingThresholds.committeeNormal}
            text={governanceGroup.dRepVotingThresholds.committeeNormal}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.committeeNoConfidence && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.committeeNoConfidence}
            tooltip={translations.tooltip.dRepVotingThresholds.committeeNoConfidence}
            text={governanceGroup.dRepVotingThresholds.committeeNoConfidence}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.updateToConstitution && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.updateConstitution}
            tooltip={translations.tooltip.dRepVotingThresholds.updateConstitution}
            text={governanceGroup.dRepVotingThresholds.updateToConstitution}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.hardForkInitiation && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.hardForkInitiation}
            tooltip={translations.tooltip.dRepVotingThresholds.hardForkInitiation}
            text={governanceGroup.dRepVotingThresholds.hardForkInitiation}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.ppNetworkGroup && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.ppNetworkGroup}
            tooltip={translations.tooltip.dRepVotingThresholds.ppNetworkGroup}
            text={governanceGroup.dRepVotingThresholds.ppNetworkGroup}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.ppEconomicGroup && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.ppEconomicGroup}
            tooltip={translations.tooltip.dRepVotingThresholds.ppEconomicGroup}
            text={governanceGroup.dRepVotingThresholds.ppEconomicGroup}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.ppTechnicalGroup && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.ppTechnicalGroup}
            tooltip={translations.tooltip.dRepVotingThresholds.ppTechnicalGroup}
            text={governanceGroup.dRepVotingThresholds.ppTechnicalGroup}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.ppGovGroup && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.ppGovernanceGroup}
            tooltip={translations.tooltip.dRepVotingThresholds.ppGovernanceGroup}
            text={governanceGroup.dRepVotingThresholds.ppGovGroup}
          />
        </Cell>
      )}
      {governanceGroup?.dRepVotingThresholds?.treasuryWithdrawal && (
        <Cell>
          <Metadata
            label={translations.dRepVotingThresholds.treasuryWithdrawal}
            tooltip={translations.tooltip.dRepVotingThresholds.treasuryWithdrawal}
            text={governanceGroup.dRepVotingThresholds.treasuryWithdrawal}
          />
        </Cell>
      )}
    </>
  );
};
