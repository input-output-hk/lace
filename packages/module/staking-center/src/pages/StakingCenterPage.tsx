import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import {
  Blockchains,
  Column,
  PageContainerTemplate,
  StakingStatusCard,
  Text,
  spacing,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { StakingOptionCard } from '../components/StakingOptionCard';
import { useLaceSelector, useLoadModules } from '../hooks';

import { useStakingCenter } from './useStakingCenter';

import type { TranslationKey } from '@lace-contract/i18n';
import type { StakingCenterProductCard } from '@lace-contract/staking-center';

const LOGO_SIZE = 28;
/** Cardano brand blue for the monochrome Cardano logo. */
const CARDANO_BLUE = '#0033AD';

/**
 * Staking Center root — a hub of compact staking-option cards (Cardano staking +
 * module-contributed products such as RealFi USDr). Each card shows a
 * Total Balance / Yield summary and drills DOWN one level on tap: the Cardano
 * card opens the full-screen Cardano staking detail; product cards open theirs.
 */
export const StakingCenterPage = () => {
  const {
    totalAdaDisplay,
    cardanoYieldDisplay,
    productCardBalanceOf,
    hubStakingStatusOf,
    // Gates the Cardano card: a wallet with no Cardano account (e.g.
    // Bitcoin-only) must not see a card that dead-ends on an empty page.
    hasCardanoAccounts,
  } = useStakingCenter();
  const { t } = useTranslation();

  const openCardanoStaking = useCallback(() => {
    NavigationControls.navigate(StackRoutes.CardanoStakingDetail);
  }, []);

  // Module-contributed product cards (e.g. RealFi "USDr Staking") via the shared
  // addon contract (ADR-14-safe — no module↔module import). A contributing
  // module loads when ANY network enables it, so each card is re-checked here
  // against the live flags + active network — a preview-only product must not
  // render on preprod/mainnet, and network switches happen without a reload.
  const contributedAddons = useLoadModules(
    'addons.loadStakingCenterProductCard',
  );
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const activeNetworkId = useLaceSelector(
    'network.selectActiveNetworkId',
    'Cardano',
  );
  const productCards = useMemo<StakingCenterProductCard[]>(
    () =>
      (contributedAddons ?? [])
        .flatMap(addon => addon.cards)
        .filter(card =>
          card.isEnabledForNetwork(featureFlags, activeNetworkId),
        ),
    [contributedAddons, featureFlags, activeNetworkId],
  );

  // The cards' per-render resolvers read module caches, not store state, so
  // no selector re-renders this page when those caches change — a mirror
  // write landing after the last render would stay invisible until an
  // unrelated re-render. Each card's `subscribe` closes that gap.
  const [, onCardDataChange] = useReducer((version: number) => version + 1, 0);
  useEffect(() => {
    const unsubscribes = productCards.flatMap(
      card => card.subscribe?.(onCardDataChange) ?? [],
    );
    // The subscription starts after paint and the caches don't replay on
    // subscribe, so re-read once: a write landing between this render's cache
    // read and the subscription would otherwise be dropped.
    onCardDataChange();
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [productCards, onCardDataChange]);

  // Contributed promo banners (LW-15495 Genesis Boost) render below the
  // status card. Each component self-gates (flags, network, date window), so
  // the host renders them unconditionally and stays product-neutral.
  const contributedBanners = useMemo(
    () =>
      (contributedAddons ?? []).flatMap(addon =>
        addon.banner ? [addon.banner] : [],
      ),
    [contributedAddons],
  );

  // Combined "Total Earned" across Cardano + contributed products (LW-14651);
  // undefined hides the card until the user has a staking position.
  // Deliberately not memoized: it folds the same cache-backed figures the
  // subscription above exists for, so it must re-resolve on those renders.
  const hubStakingStatus = hubStakingStatusOf(productCards);

  return (
    <PageContainerTemplate>
      <Column gap={spacing.L} style={styles.container}>
        <Column alignItems="center" gap={spacing.XS}>
          <Text.XL>{t('v2.generic.staking.card.title')}</Text.XL>
          <Text.S variant="secondary">
            {t('v2.generic.staking.center.subtitle')}
          </Text.S>
        </Column>

        {hubStakingStatus && (
          <View testID="hub-staking-status-card">
            <StakingStatusCard
              {...hubStakingStatus}
              testID="hub-staking-summary"
            />
          </View>
        )}

        {contributedBanners.map(({ id, Component }) => (
          <Component key={id} />
        ))}

        {hasCardanoAccounts && (
          <StakingOptionCard
            icon={
              <View style={styles.cardanoBadge}>
                <Blockchains.Cardano size={LOGO_SIZE * 0.66} color="#FFFFFF" />
              </View>
            }
            title={t('v2.generic.staking.center.cardano-card-title')}
            balanceLabel={t('v2.generic.staking.center.total-balance')}
            balanceValue={totalAdaDisplay}
            yieldLabel={t('v2.generic.staking.center.yield')}
            yieldValue={cardanoYieldDisplay}
            onPress={openCardanoStaking}
            testID="cardano-staking-card"
          />
        )}

        {productCards.map(card => (
          <StakingOptionCard
            key={card.id}
            // Contributor-supplied brand icon (contract `icon`) — the hub
            // must not hardcode any product's logo.
            icon={card.icon ? <card.icon size={LOGO_SIZE} /> : undefined}
            // Contract carries the key as string (TranslationKey in the addon
            // type overflows module type serialization, TS7056); the
            // contributor guarantees validity via `satisfies TranslationKey`.
            title={t(card.titleKey as TranslationKey)}
            balanceLabel={t('v2.generic.staking.center.total-balance')}
            balanceValue={productCardBalanceOf(card)}
            yieldLabel={t('v2.generic.staking.center.yield')}
            yieldValue={card.apyDisplay(featureFlags, activeNetworkId)}
            onPress={card.onPress}
            testID={`product-card-${card.id}`}
          />
        ))}
      </Column>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.L,
  },
  // Official Cardano mark: white gimbal centred on a blue filled circle.
  cardanoBadge: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: CARDANO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
