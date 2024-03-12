/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */
/* eslint-disable react/no-multi-comp */
import React, { forwardRef } from 'react';

import * as Select from '@radix-ui/react-select';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './auto-suggest-box-suggestion.css';

import type {
  SuggestionClassicType,
  SuggestionThreeItemType,
  SuggestionType,
} from './auto-suggest-box-types';

export interface SuggestionComponentProps {
  suggestion: SuggestionType;
  onClick: (value: string) => void;
}

const getSuggestionComponent = (
  props: Readonly<SuggestionType>,
): JSX.Element => {
  if ('title' in props) {
    return <SuggestionThreeItem {...props} />;
  }

  return <SuggestionClassic {...props} />;
};

export const Suggestion = forwardRef<HTMLDivElement, SuggestionComponentProps>(
  function Suggestion({ onClick, suggestion }, ref): JSX.Element {
    return (
      <Select.Item
        tabIndex={0}
        ref={ref}
        data-testid={`auto-suggest-box-suggestion-${suggestion.value}`}
        value={suggestion.value}
        className={cx.suggestion}
        onClick={(): void => {
          onClick(suggestion.value);
        }}
        onKeyDown={(event): void => {
          if (event.code === 'Enter') {
            onClick(suggestion.value);
          }
        }}
      >
        {getSuggestionComponent(suggestion)}
      </Select.Item>
    );
  },
);

export const SuggestionClassic = ({
  label,
  value,
}: Readonly<SuggestionClassicType>): JSX.Element => {
  return <Text.Body.Large weight="$semibold">{label ?? value}</Text.Body.Large>;
};

export const SuggestionThreeItem = ({
  title,
  description,
}: Readonly<SuggestionThreeItemType>): JSX.Element => {
  return (
    <Flex alignItems="center" justifyContent="space-between">
      <Flex className={cx.title}>
        <Box className={cx.initial}>
          <Text.Body.Large weight="$bold">{title[0]}</Text.Body.Large>
        </Box>
        <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
      </Flex>
      <Text.Address className={cx.address}>{description}</Text.Address>
    </Flex>
  );
};
