import React from 'react';
import { PaperWalletInfoCard } from '@lace/core';
import { i18n } from '@lace/translation';
import { Text, Flex } from '@input-output-hk/lace-ui-toolkit';

export const SaveStage = ({ walletName }: { walletName: string }): JSX.Element => (
  <Flex gap="$16" mt="$8" flexDirection="column">
    <Text.Body.Normal color="secondary">{i18n.t('paperWallet.savePaperWallet.description')}</Text.Body.Normal>
    <PaperWalletInfoCard walletName={walletName} />
  </Flex>
);
