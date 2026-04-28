import { isNotNil } from '@cardano-sdk/util';
import React, { useMemo } from 'react';

import { ActivityDetailItem } from '../../ActivityDetailItem';

import type {
  DeepPartial,
  TechnicalGroup as TechnicalGroupType,
  Translations,
} from './types';

interface Props {
  technicalGroup?: DeepPartial<TechnicalGroupType>;
  translations: Translations['technicalGroup'];
}

export const TechnicalGroup = ({
  technicalGroup,
  translations,
}: Props): React.JSX.Element => {
  const costModels: React.JSX.Element | undefined = useMemo(() => {
    if (technicalGroup?.costModels) {
      const costModelValues = Object.entries(technicalGroup?.costModels)
        .map(([key, value]) => ({
          title: key,
          fields: Object.entries(value)
            .map(([cKey, cValue]) => ({
              label: cKey,
              value: cValue ?? '',
            }))

            .filter(isNotNil),
        }))

        .filter(isNotNil);
      return costModelValues.length > 0 ? (
        <React.Fragment key="costModels">
          <ActivityDetailItem label={translations.costModels} />
          {costModelValues.map(({ title, fields }) => (
            <React.Fragment key={title}>
              <ActivityDetailItem label={title} />
              {fields.map(({ label, value }) => (
                <ActivityDetailItem key={label} label={label} value={value} />
              ))}
            </React.Fragment>
          ))}
        </React.Fragment>
      ) : undefined;
    }
  }, [technicalGroup?.costModels, translations]);

  const metadatums: React.JSX.Element[] | undefined = useMemo(() => {
    if (!technicalGroup) return;
    const technicalGroupEntries = Object.entries(technicalGroup) as [
      keyof TechnicalGroupType,
      string,
    ][];

    return technicalGroupEntries
      .flatMap(entry => {
        const [key, value] = entry;
        if (value && key !== 'costModels') {
          return (
            <ActivityDetailItem
              key={key}
              label={translations[key]}
              value={value}
            />
          );
        }
      })

      .filter(isNotNil);
  }, [technicalGroup, translations]);

  return (
    <>
      <ActivityDetailItem label={translations.title} />
      {metadatums}
      {costModels}
    </>
  );
};
