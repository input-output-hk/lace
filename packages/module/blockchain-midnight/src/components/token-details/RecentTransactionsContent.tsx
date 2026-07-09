import type { ComponentType } from 'react';

import { useTranslation } from '@lace-contract/i18n';
import { Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { View } from 'react-native';

import type { TokenDetailsUICustomization } from '@lace-contract/app';
import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';

type RecentTransactionsContentProps =
  TokenDetailsUICustomization<MidnightSpecificTokenMetadata>['RecentTransactionsContent'] extends ComponentType<
    infer P
  >
    ? P
    : never;

export const RecentTransactionsContent = ({
  token,
}: RecentTransactionsContentProps) => {
  const { t } = useTranslation();
  if (token.metadata?.blockchainSpecific.kind !== 'shielded') return null;
  return (
    <View>
      <Text.S
        variant="secondary"
        testID="recent-transactions-privacy-information-title">
        {t('midnight.token-detail-drawer.privacy-information-title')}
      </Text.S>
      <Text.S
        variant="secondary"
        testID="recent-transactions-privacy-information">
        {t('midnight.token-detail-drawer.privacy-information')}
      </Text.S>
    </View>
  );
};
