import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  GovernanceCenterMain,
  PageContainerTemplate,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useGovernanceCenter } from './useGovernanceCenter';

import type { TabScreenProps, TabRoutes } from '@lace-lib/navigation';

export const GovernanceCenterPage = (
  _props: TabScreenProps<TabRoutes.GovernanceCenter>,
) => {
  const {
    governanceStatusCard,
    governanceCards,
    hasCardanoAccounts,
    searchValue,
    debouncedSearchValue,
    onSearchChange,
    isDRepDataUnavailable,
    retryFetchDReps,
  } = useGovernanceCenter();
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('governance | session | start');
  }, [trackEvent]);

  if (!hasCardanoAccounts) {
    return (
      <PageContainerTemplate>
        <Column
          justifyContent="center"
          alignItems="center"
          style={styles.container}>
          <Text.XL align="center">
            {t('v2.governance.center.no-cardano-accounts')}
          </Text.XL>
        </Column>
      </PageContainerTemplate>
    );
  }

  return (
    <GovernanceCenterMain
      governanceStatusCard={governanceStatusCard}
      governanceCards={governanceCards}
      searchValue={searchValue}
      debouncedSearchValue={debouncedSearchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('v2.governance.center.search-placeholder')}
      showSearchBar={governanceStatusCard.totalAccountsCount > 1}
      dRepDataError={
        isDRepDataUnavailable
          ? {
              message: t('v2.governance.center.drep-data-error.message'),
              retryLabel: t('v2.governance.center.drep-data-error.retry'),
              onRetry: retryFetchDReps,
            }
          : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.M,
  },
});
