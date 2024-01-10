import React from 'react';
import { sx, Box, Flex, Text, Button, EducationalCard } from '@lace/ui';
import { ReactComponent as BookGradient } from '@lace/ui/dist/assets/icons/book-gradient.component.svg';
import { ReactComponent as LightBulbGradient } from '@lace/ui/dist/assets/icons/light-bulb-gradient.component.svg';

type Educational = {
  title: string;
  subtitle: string;
};

interface Props {
  translations: {
    title: string;
    subtitle: string;
    educational: {
      multiSig: Educational;
      advancedFeatures: Educational;
      tips: Educational;
    };
    goToSharedWallet: string;
  };
}

export const AllSet = ({ translations }: Props): JSX.Element => (
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
    <Box h="$fill" w="$fill">
      <EducationalCard.Item
        label={translations.educational.multiSig.subtitle}
        title={translations.educational.multiSig.title}
        icon={<BookGradient />}
      />
      <EducationalCard.Item
        label={translations.educational.advancedFeatures.subtitle}
        title={translations.educational.advancedFeatures.title}
        icon={<BookGradient />}
      />
      <EducationalCard.Item
        label={translations.educational.tips.subtitle}
        title={translations.educational.tips.title}
        icon={<LightBulbGradient />}
      />
    </Box>
    <Flex w="$fill" justifyContent="flex-end" alignItems="center">
      <Button.CallToAction label={translations.goToSharedWallet} />
    </Flex>
  </Flex>
);
