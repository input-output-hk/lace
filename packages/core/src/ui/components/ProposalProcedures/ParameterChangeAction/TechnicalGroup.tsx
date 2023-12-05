import React from 'react';
import { Box, Metadata, Text, sx, Cell } from '@lace/ui';
import * as Types from './ParameterChangeActionTypes';
import { Card } from '../components/Card';

interface Props {
  technicalGroup: Types.TechnicalGroup;
  translations: Types.Translations['technicalGroup'];
}

export const TechnicalGroup = ({ technicalGroup, translations }: Props): JSX.Element => {
  const textCss = sx({
    color: '$text_primary'
  });

  const costModels = Object.entries(technicalGroup.costModels).map(([key, value]) => ({
    title: key,
    fields: Object.entries(value).map(([cKey, cValue]) => ({
      label: cKey,
      value: cValue
    }))
  }));

  return (
    <>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.title}
        </Text.Body.Large>
      </Cell>
      <Cell>
        <Metadata label={translations.costModels} tooltip={translations.tooltip.costModels} text="" />
      </Cell>
      <Cell>
        <Metadata label={translations.a0} tooltip={translations.tooltip.a0} text={technicalGroup.a0} />
      </Cell>
      <Cell>
        <Metadata label={translations.eMax} tooltip={translations.tooltip.eMax} text={technicalGroup.eMax} />
      </Cell>
      <Cell>
        <Metadata label={translations.nOpt} tooltip={translations.tooltip.nOpt} text={technicalGroup.nOpt} />
      </Cell>
      <Cell>
        <Text.Body.Large className={textCss} weight="$bold">
          {translations.costModels}
        </Text.Body.Large>
      </Cell>
      <Cell>
        {costModels.map(({ title, fields }, idx) => (
          <Box mt={idx > 0 ? '$24' : '$0'} mb={costModels.length === idx - 1 ? '$18' : '$0'} key={title}>
            <Card title={title} tooltip={translations.tooltip.costModels} data={fields} />
          </Box>
        ))}
      </Cell>
    </>
  );
};
