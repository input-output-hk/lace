import React from 'react';
import { sx, Flex, Text, Loader } from '@input-output-hk/lace-ui-toolkit';

interface Props {
  translations: {
    title: string;
    subtitle: string;
  };
}

export const WalletSyncing = ({ translations }: Props): JSX.Element => (
  <Flex h="$fill" alignItems="center" justifyContent="center" flexDirection="column" w="$fill">
    <Flex w="$fill" mb={'$32'} alignItems="center" justifyContent="center">
      <Loader />
    </Flex>
    <Flex w="$fill" mb={'$10'} mt="$4" alignItems="center" justifyContent="center">
      <Text.Heading
        className={sx({
          color: '$text_primary'
        })}
      >
        {translations.title}
      </Text.Heading>
    </Flex>
    <Flex w="$fill" mt={'$4'} alignItems="center" justifyContent="center">
      <Text.Body.Normal
        className={sx({
          color: '$text_secondary'
        })}
      >
        {translations.subtitle}
      </Text.Body.Normal>
    </Flex>
  </Flex>
);
