/* eslint-disable react/no-multi-comp */
import React from 'react';

import { Box } from '../box';
import { Flex } from '../flex';
import { UserProfile } from '../profile-picture';
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
