import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  LiquiditySourceToggle,
  Text,
  Sheet,
  footerHeight,
} from '@lace-lib/ui-toolkit';
import { spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SwapLiquiditySources = (
  props: SheetScreenProps<SheetRoutes.SwapLiquiditySources>,
) => {
  const { t } = useTranslation();
  const availableDexes = useLaceSelector('swapConfig.selectAvailableDexes');
  const currentExcluded = useLaceSelector('swapConfig.selectExcludedDexes');
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');
  const dispatchSetExcludedDexes = useDispatchLaceAction(
    'swapConfig.setExcludedDexes',
  );
  const { trackEvent } = useAnalytics();

  const [localExcluded, setLocalExcluded] = useState<string[]>(
    currentExcluded ?? [],
  );

  const handleToggle = useCallback(
    (dexId: string, isEnabled: boolean) => {
      setLocalExcluded(previous => {
        if (isEnabled) return previous.filter(id => id !== dexId);
        const nextExcluded = [...previous, dexId];
        // Prevent excluding the last remaining source
        if (nextExcluded.length >= (availableDexes?.length ?? 0)) {
          return previous;
        }
        return nextExcluded;
      });
    },
    [availableDexes],
  );

  const handleConfirm = useCallback(() => {
    trackEvent('swaps | adjust sources', {
      excludedDexs: localExcluded,
      ...(swapSessionId && { swapSessionId }),
    });
    dispatchSetExcludedDexes(localExcluded);
    NavigationControls.closeSheet();
  }, [localExcluded, dispatchSetExcludedDexes, trackEvent, swapSessionId]);

  const dexItems = useMemo(
    () =>
      (availableDexes ?? []).map(dex => ({
        ...dex,
        isEnabled: !localExcluded.includes(dex.id),
      })),
    [availableDexes, localExcluded],
  );

  const isLoading = availableDexes === null;

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('v2.swap.liquidity-sources.title')}
          testID="swap-liquidity-sources-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.swap.liquidity-sources.confirm'),
            onPress: handleConfirm,
            disabled: isLoading,
            testID: 'swap-liquidity-sources-confirm',
          }}
        />
      ),
    });
  }, [props.navigation, t, handleConfirm, isLoading]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.container}>
      <Column gap={spacing.S}>
        <Text.M testID="swap-liquidity-sources-description">
          {t('v2.swap.liquidity-sources.description')}
        </Text.M>
        <Text.XS
          variant="secondary"
          testID="swap-liquidity-sources-description-2">
          {t('v2.swap.liquidity-sources.description-2')}
        </Text.XS>
      </Column>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Column gap={spacing.S}>
          {dexItems.map(dex => (
            <LiquiditySourceToggle
              key={dex.id}
              name={dex.name}
              value={dex.isEnabled}
              onValueChange={value => {
                handleToggle(dex.id, value);
              }}
              testID={`swap-liquidity-source-${dex.id}`}
            />
          ))}
        </Column>
      )}
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: footerHeight.horizontal,
    gap: spacing.S,
  },
});
