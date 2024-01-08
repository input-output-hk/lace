import React, { useState } from 'react';
import { sx, Box, Cell, Grid, Flex, Text, Button, Checkbox } from '@lace/ui';

interface Props {
  onNext: () => void;
  onBack: () => void;
  translations: {
    title: string;
    subtitle: string;
    checkBoxLabel: string;
    backButton: string;
    nextButton: string;
  };
}

export const ImportantInfo = ({ translations, onBack, onNext }: Props): JSX.Element => {
  const [checked, setChecked] = useState(false);

  return (
    <Flex h="$fill" flexDirection="column">
      <Box mb="$24">
        <Text.Heading
          className={sx({
            color: '$text_primary'
          })}
        >
          {translations.title}
        </Text.Heading>
      </Box>
      <Box mb="$24">
        <Text.Body.Normal
          weight="$medium"
          className={sx({
            color: '$text_secondary'
          })}
        >
          {translations.subtitle}
        </Text.Body.Normal>
      </Box>
      <Grid columns="$1" gutters="$20">
        <Cell>
          <Flex>
            <Checkbox checked={checked} onClick={() => setChecked(!checked)} />
            <Box ml="$10" style={{ marginTop: -5 }}>
              <Text.Body.Small weight="$medium">{translations.checkBoxLabel}</Text.Body.Small>
            </Box>
          </Flex>
        </Cell>
      </Grid>
      <Flex w="$fill" justifyContent="space-between" alignItems="center">
        <Button.Secondary label={translations.backButton} onClick={onBack} />
        <Button.CallToAction label={translations.nextButton} onClick={onNext} />
      </Flex>
    </Flex>
  );
};
