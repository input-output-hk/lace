/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import * as Text from '../typography';

import * as cx from './auto-suggest-box-suggestion.css';

import type {
  SuggestionClassic as SuggestionClassicType,
  Suggestion3Item as Suggestion3ItemType,
} from './auto-suggest-box-types';

export const SuggestionClassic = ({
  label,
  value,
}: Readonly<SuggestionClassicType>): JSX.Element => {
  return <Text.Body.Large weight="$semibold">{label ?? value}</Text.Body.Large>;
};

export const PickedSuggestionClassic = ({
  label,
  value,
}: Readonly<SuggestionClassicType>): JSX.Element => {
  return <Box className={cx.pickedSuggesion}>{label ?? value}</Box>;
};

export const Suggestion3Item = ({
  title,
  description,
}: Readonly<Suggestion3ItemType>): JSX.Element => {
  return (
    <Flex className={cx.suggestion3Item}>
      <Flex className={cx.suggestion3ItemCol}>
        <Box className={cx.initial}>
          <Text.Body.Large weight="$bold">{title[0]}</Text.Body.Large>
        </Box>
        <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
      </Flex>
      <Box className={cx.suggestion3ItemCol}>
        <Text.Address className={cx.address}>{description}</Text.Address>
      </Box>
    </Flex>
  );
};

export const PickedSuggestion3Item = ({
  title,
  description,
}: Readonly<Suggestion3ItemType>): JSX.Element => {
  return (
    <Flex className={cx.pickedSuggesion} alignItems="center">
      <Box mr="$8">
        <Text.Body.Large weight="$semibold">{title}</Text.Body.Large>
      </Box>
      <Text.Address className={cx.address}>{description}</Text.Address>
    </Flex>
  );
};
