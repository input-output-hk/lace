import { isNotNil } from '@cardano-sdk/util';
import React, { useMemo } from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type * as Types from './types';

interface Props {
  governanceGroup?: Types.DeepPartial<Types.GovernanceGroup>;
  translations: Types.Translations['governanceGroup'];
}

export const GovernanceGroup = ({
  governanceGroup,
  translations,
}: Props): React.JSX.Element => {
  const metadatums: React.JSX.Element[] | undefined = useMemo(() => {
    if (!governanceGroup) return;
    const governanceGroupEntries = Object.entries(governanceGroup) as [
      keyof Types.GovernanceGroup,
      string,
    ][];
    return governanceGroupEntries
      .flatMap(entry => {
        const [key, value] = entry;
        if (value && key !== 'dRepVotingThresholds') {
          return <ActivityDetailItem label={translations[key]} value={value} />;
        }
      })

      .filter(isNotNil);
  }, [governanceGroup, translations]);

  const dRepVotingThresholdsMetadatums: React.JSX.Element[] | undefined =
    useMemo(() => {
      if (!governanceGroup) return;
      const dRepVotingThresholdsEntries = Object.entries(
        governanceGroup.dRepVotingThresholds,
      ) as [keyof Types.GovernanceGroup['dRepVotingThresholds'], string][];
      return dRepVotingThresholdsEntries
        .flatMap(entry => {
          const [key, value] = entry;
          if (value) {
            return (
              <ActivityDetailItem
                label={translations.dRepVotingThresholds[key]}
                value={value}
              />
            );
          }
        })

        .filter(isNotNil);
    }, [governanceGroup, translations]);

  return (
    <>
      <ActivityDetailItem label={translations.title} />
      {metadatums}
      {governanceGroup?.dRepVotingThresholds && (
        <>
          <ActivityDetailItem label={translations.dRepVotingThresholds.title} />
          {dRepVotingThresholdsMetadatums}
        </>
      )}
    </>
  );
};
