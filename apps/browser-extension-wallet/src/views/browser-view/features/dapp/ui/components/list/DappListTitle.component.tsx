import React from 'react';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';

export const DappListTitle = ({ title, count }: { title: string; count?: number }) => (
  <Flex alignItems="flex-end">
    <Text.Heading>{title}</Text.Heading>
    {count !== undefined ? <Text.Label>({count})</Text.Label> : null}
  </Flex>
);
