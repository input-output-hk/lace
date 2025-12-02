/* eslint-disable complexity, sonarjs/cognitive-complexity, consistent-return */
import React, { useMemo } from 'react';
import { Metadata, Text, sx, Cell, Box } from '@input-output-hk/lace-ui-toolkit';
import * as Types from './ParameterChangeActionTypes';
import { isNotNil } from '@cardano-sdk/util';
import { Card } from '../components/Card';

interface Props {
  technicalGroup?: Types.DeepPartial<Types.TechnicalGroup>;
  translations: Types.Translations['technicalGroup'];
}

export const TechnicalGroup = ({ technicalGroup, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  const costModels: JSX.Element | undefined = useMemo(() => {
    if (technicalGroup?.costModels) {
      const costModelValues = Object.entries(technicalGroup?.costModels)
        .map(([key, value]) => ({
          title: key,
          fields: Object.entries(value)
            .map(([cKey, cValue]) => ({
              label: cKey,
              value: cValue ?? ''
            }))
            // eslint-disable-next-line unicorn/no-array-callback-reference
            .filter(isNotNil)
        }))
        // eslint-disable-next-line unicorn/no-array-callback-reference
        .filter(isNotNil);
      return costModelValues.length > 0 ? (
        <>
          <Cell>
            <Text.Body.Large className={textCss} weight="$bold">
              {translations.costModels}
            </Text.Body.Large>
          </Cell>

          {costModelValues.map(({ title, fields }, idx) => (
            <Box mt={idx > 0 ? '$24' : '$0'} mb={costModelValues.length === idx - 1 ? '$18' : '$0'} key={title}>
              <Card title={title} tooltip={translations.tooltip.costModels} data={fields} />
            </Box>
          ))}
        </>
      ) : undefined;
    }
  }, [technicalGroup?.costModels, translations, textCss]);

  const metadatums: JSX.Element[] | undefined = useMemo(() => {
    if (!technicalGroup) return;
    return (
      Object.entries(technicalGroup)
        .flatMap((entry: [keyof Types.TechnicalGroup, string]) => {
          const [key, value] = entry;
          if (value && key !== 'costModels') {
            return (
              <Cell key={`metadatum${key}`}>
                <Metadata label={translations[key]} tooltip={translations.tooltip[key]} text={value} />
              </Cell>
            );
          }
        })
        // eslint-disable-next-line unicorn/no-array-callback-reference
        .filter(isNotNil)
    );
  }, [technicalGroup, translations]);

  return (
    <>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.title}
        </Text.Body.Large>
      </Cell>
      {metadatums}
      {costModels}
    </>
  );
};
