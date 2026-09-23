import { useTranslation } from '@lace-contract/i18n';
import {
  Column,
  PageContainerTemplate,
  spacing,
  StakeCenterMain,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { useStakingCenter } from './useStakingCenter';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

/**
 * Cardano staking detail — the full-screen page one level below the Staking
 * Center hub. Holds everything that used to live on the staking-center root:
 * network info, the aggregate staking status, and the per-account stake cards
 * (with their delegation/issue sheet actions). Reached by pressing the Cardano
 * staking card on the hub. Product cards (e.g. RealFi USDr) stay on the hub.
 */
export const CardanoStakingDetail = (
  props: StackScreenProps<StackRoutes.CardanoStakingDetail>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const {
    stakeCards,
    stakingStatusCard,
    networkInfoCard,
    hasCardanoAccounts,
    cardanoAccounts,
    searchValue,
    debouncedSearchValue,
    onSearchChange,
  } = useStakingCenter();

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
      title={t('v2.generic.staking.center.cardano-card-title')}
      onBack={onBack}
      searchPlaceholder={t('v2.generic.staking.center.search-placeholder')}
      searchValue={searchValue}
      debouncedSearchValue={debouncedSearchValue}
      onSearchChange={onSearchChange}
      showSearchBar={
        Array.isArray(cardanoAccounts) && cardanoAccounts.length > 1
      }
      networkInfoCard={networkInfoCard}
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
