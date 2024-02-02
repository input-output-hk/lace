/* eslint-disable arrow-body-style */
import React from 'react';
import { Box, Flex, Text, Button, AutoSuggestBox, ControlButton } from '@lace/ui';
import * as cx from './AddCoSigners.css';
import { ReactComponent as GridIcon } from '@lace/icons/dist/GridComponent';
import { Cardano, HandleResolution } from '@cardano-sdk/core';

interface Props {
  onNext: () => void;
  onBack: () => void;
  translations: {
    title: string;
    subtitle: string;
    inputLabel: string;
    addButton: string;
    backButton: string;
    nextButton: string;
  };
}

type CoSigner = string;

export const AddCoSigners = ({ translations, onBack, onNext }: Props): JSX.Element => {
  const coSigners: CoSigner[] = [''];

  return (
    <Flex h="$fill" w="$fill" flexDirection="column">
      <Box mb="$24">
        <Text.Heading className={cx.text}>{translations.title}</Text.Heading>
      </Box>
      <Box mb="$64">
        <Text.Body.Normal weight="$medium" className={cx.text}>
          {translations.subtitle}
        </Text.Body.Normal>
      </Box>

      <Box mb="$8" w="$fill">
        {coSigners.map((value) => (
          <Box key={value} w="$fill">
            <AutoSuggestBox label={translations.inputLabel} />
          </Box>
        ))}
      </Box>
      <Box mb="$8">
        <Text.Body.Small weight="$bold" className={cx.text}>
          {coSigners.length}/20
        </Text.Body.Small>
      </Box>
      <Box mb="$148" w="$fill">
        <ControlButton.Outlined w="$fill" label={translations.addButton} icon={<GridIcon />} />
      </Box>

      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={onBack} />
        <Button.CallToAction disabled label={translations.nextButton} onClick={onNext} />
      </Flex>
    </Flex>
  );
};
