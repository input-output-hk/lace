import React from 'react';
import { Box, Cell, Metadata, Text, sx } from '@lace/ui';
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
        <Metadata label="Cost Models" tooltip={translations.tooltip.costModels} text="" />
      </Cell>
      <Cell>
        <Metadata label="A0" tooltip={translations.tooltip.a0} text={technicalGroup.a0} />
      </Cell>
      <Cell>
        <Metadata label="EMax" tooltip={translations.tooltip.eMax} text={technicalGroup.eMax} />
      </Cell>
      <Cell>
        <Metadata label="NOpt" tooltip={translations.tooltip.nOpt} text={technicalGroup.nOpt} />
      </Cell>
      <Cell>
        {costModels.map(({ title, fields }, idx) => (
          <Box mt={idx > 0 ? '$24' : '$0'} key={title}>
            <Card title={`Cost Models - ${title}`} tooltip={translations.tooltip.costModels} data={fields} />
          </Box>
        ))}
      </Cell>
    </>
  );
};
