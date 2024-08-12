import React from 'react';
import { PaperWalletInfoCard } from '@lace/core';
import { Flex } from '@input-output-hk/lace-ui-toolkit';

export const SaveStage = ({ walletName }: { walletName: string }): JSX.Element => (
  <Flex gap="$16" mt="$8" flexDirection="column">
    <PaperWalletInfoCard walletName={walletName} />
  </Flex>
);
