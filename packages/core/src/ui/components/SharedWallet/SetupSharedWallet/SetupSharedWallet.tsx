import React from 'react';
import { sx, Box, Cell, Grid, Flex, Text, TextBox, Button } from '@lace/ui';

interface Props {
  translations: {
    title: string;
    subtitle: string;
    textBoxLabel: string;
    backButton: string;
    nextButton: string;
  };
  data: {
    isNextEnabled: boolean;
    name: string;
  };
  events: {
    onNameChange: (name: string) => void;
    onBack: () => void;
    onNext: () => void;
  };
}

export const SetupSharedWallet = ({ translations, data, events }: Props): JSX.Element => (
  <Flex h="$fill" flexDirection="column">
    <Box mb={'$24'}>
      <Text.Heading
        className={sx({
          color: '$text_primary'
        })}
      >
        {translations.title}
      </Text.Heading>
    </Box>
    <Box mb={'$40'}>
      <Text.Body.Normal
        className={sx({
          color: '$text_secondary'
        })}
      >
        {translations.subtitle}
      </Text.Body.Normal>
    </Box>
    <Grid columns="$1" gutters="$20">
      <Cell>
        <TextBox
          label={translations.textBoxLabel}
          w="$fill"
          value={data.name}
          onChange={(e) => events.onNameChange(e.target.value)}
        />
      </Cell>
    </Grid>
    <Flex w="$fill" justifyContent="space-between" alignItems="center">
      <Button.Secondary label={translations.backButton} onClick={() => events.onBack()} />
      <Button.CallToAction
        label={translations.nextButton}
        onClick={() => events.onNext()}
        disabled={!data.isNextEnabled}
      />
    </Flex>
  </Flex>
);
