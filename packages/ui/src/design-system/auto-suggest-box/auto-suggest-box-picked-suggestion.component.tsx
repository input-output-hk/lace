/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './auto-suggest-box-picked-suggestion.css';

import type {
  SuggestionClassicType,
  SuggestionThreeItemType,
  SuggestionType,
} from './auto-suggest-box-types';

interface BasePickedSuggestionProps {
  onClick: () => void;
}

const PickedSuggestionClassic = ({
  label,
  value,
  onClick,
}: Readonly<
  BasePickedSuggestionProps & SuggestionClassicType
>): JSX.Element => {
  return (
    <div
      data-testid="auto-suggest-box-picked-suggestion"
      className={cx.pickedSuggesion}
      onKeyDown={onClick}
      onClick={onClick}
    >
      <Box>{label ?? value}</Box>
    </div>
  );
};

const PickedSuggestionThreeItem = ({
  title,
  description,
  onClick,
}: Readonly<
  BasePickedSuggestionProps & SuggestionThreeItemType
>): JSX.Element => {
  return (
    <div
      data-testid="auto-suggest-box-picked-suggestion"
      className={cx.pickedSuggesion}
      onKeyDown={onClick}
      onClick={onClick}
    >
      <Flex alignItems="center">
        <Box mr="$8">
          <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
        </Box>
        <Text.Address className={cx.address}>{description}</Text.Address>
      </Flex>
    </div>
  );
};

export const PickedSuggestion = (
  props: Readonly<BasePickedSuggestionProps & SuggestionType>,
): JSX.Element => {
  if ('title' in props) {
    return <PickedSuggestionThreeItem {...props} />;
  }

  return <PickedSuggestionClassic {...props} />;
};
