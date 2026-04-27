import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  PageContainerTemplate,
  spacing,
  StakeCenterMain,
  Text,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import { useStakingCenter } from './useStakingCenter';

export const StakingCenterPage = () => {
  const {
    stakeCards,
    stakingStatusCard,
    hasCardanoAccounts,
    cardanoAccounts,
    searchValue,
    debouncedSearchValue,
    onSearchChange,
  } = useStakingCenter();
  const { t } = useTranslation();

  if (!hasCardanoAccounts) {
    return (
      <PageContainerTemplate>
        <Column
          justifyContent="center"
          alignItems="center"
          style={styles.container}>
          <Text.XL align="center">
            {t('v2.generic.staking.center.no-cardano-accounts')}
          </Text.XL>
        </Column>
      </PageContainerTemplate>
    );
  }

  return (
    <StakeCenterMain
      searchPlaceholder={t('v2.generic.staking.center.search-placeholder')}
      searchValue={searchValue}
      debouncedSearchValue={debouncedSearchValue}
      onSearchChange={onSearchChange}
      showSearchBar={
        Array.isArray(cardanoAccounts) && cardanoAccounts.length > 1
      }
      stakingStatusCard={stakingStatusCard}
      stakeCards={stakeCards}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.M,
  },
});
