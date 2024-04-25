/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { Text } from '../text';

import * as cx from './auto-suggest-box-picked-suggestion.css';

import type {
  SuggestionClassicType,
  SuggestionThreeItemType,
  SuggestionType,
} from './auto-suggest-box-types';

const PickedSuggestionClassic = ({
  label,
  value,
}: Readonly<SuggestionClassicType>): JSX.Element => {
  return (
    <div
      data-testid="auto-suggest-box-picked-suggestion"
      className={cx.pickedSuggesion}
    >
      <Box>{label ?? value}</Box>
    </div>
  );
};

const PickedSuggestionThreeItem = ({
  title,
  description,
}: Readonly<SuggestionThreeItemType>): JSX.Element => {
  return (
    <div
      data-testid="auto-suggest-box-picked-suggestion"
      className={cx.pickedSuggesion}
    >
      <Flex alignItems="center">
        <Box mr="$8">
          <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
        </Box>
        <Text.Body.Large weight="$semibold" className={cx.address}>
          {description}
        </Text.Body.Large>
      </Flex>
    </div>
  );
};

export const PickedSuggestion = (
  props: Readonly<SuggestionType>,
): JSX.Element => {
  if ('title' in props) {
    return <PickedSuggestionThreeItem {...props} />;
  }

  return <PickedSuggestionClassic {...props} />;
};
