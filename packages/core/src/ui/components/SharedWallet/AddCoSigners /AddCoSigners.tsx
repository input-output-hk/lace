/* eslint-disable arrow-body-style */
import React, { useState } from 'react';
import { Box, Flex, Text, Button, AutoSuggestBox, ControlButton } from '@lace/ui';
import { ReactComponent as GridIcon } from '@lace/icons/dist/GridComponent';
import { Cardano, HandleResolution } from '@cardano-sdk/core';
import styles from './AddCoSigners.module.scss';
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

const MAX_COSIGNERS = 20;

export const AddCoSigners = ({ translations, onBack, onNext }: Props): JSX.Element => {
  const [coSigners, setCoSigners] = useState<CoSigner[]>(['']);

  return (
    <Flex h="$fill" w="$fill" flexDirection="column">
      <Box mb="$24">
        <Text.Heading>{translations.title}</Text.Heading>
      </Box>
      <Box mb="$64">
        <Text.Body.Normal weight="$medium">{translations.subtitle}</Text.Body.Normal>
      </Box>

      <Box mb="$8" w="$fill">
        {coSigners.map((value) => (
          <Box key={value} w="$fill" className={styles.coSigners}>
            <AutoSuggestBox label={translations.inputLabel} />
          </Box>
        ))}
      </Box>
      <Box mb="$8">
        <Text.Body.Small weight="$bold">
          {coSigners.length}/{MAX_COSIGNERS}
        </Text.Body.Small>
      </Box>
      <Box mb="$148" w="$fill">
        <ControlButton.Outlined
          w="$fill"
          disabled={coSigners.length === MAX_COSIGNERS}
          label={translations.addButton}
          icon={<GridIcon />}
          onClick={() => {
            setCoSigners([...coSigners, '']);
          }}
        />
      </Box>

      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={onBack} />
        <Button.CallToAction disabled label={translations.nextButton} onClick={onNext} />
      </Flex>
    </Flex>
  );
};
