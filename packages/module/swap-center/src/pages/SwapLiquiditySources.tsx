import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Column,
  LiquiditySourceToggle,
  Text,
  Sheet,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import { spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SwapLiquiditySources = (
  _props: SheetScreenProps<SheetRoutes.SwapLiquiditySources>,
) => {
  const { t } = useTranslation();
  const availableDexes = useLaceSelector('swapConfig.selectAvailableDexes');
  const currentExcluded = useLaceSelector('swapConfig.selectExcludedDexes');
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
    trackEvent('swaps | adjust sources', { excludedDexs: localExcluded });
    dispatchSetExcludedDexes(localExcluded);
    NavigationControls.sheets.close();
  }, [localExcluded, dispatchSetExcludedDexes, trackEvent]);

  const dexItems = useMemo(
    () =>
      (availableDexes ?? []).map(dex => ({
        ...dex,
        isEnabled: !localExcluded.includes(dex.id),
      })),
    [availableDexes, localExcluded],
  );

  const isLoading = availableDexes === null;

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={t('v2.swap.liquidity-sources.title')}
        testID={'theme-selection-sheet-header'}
      />
      <Sheet.Scroll contentContainerStyle={scrollContainerStyle}>
        <Column style={{ paddingBottom: spacing.M }} gap={spacing.S}>
          <Text.M>{t('v2.swap.liquidity-sources.description')}</Text.M>
          <Text.XS variant="secondary">
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
              />
            ))}
          </Column>
        )}
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: t('v2.swap.liquidity-sources.confirm'),
          onPress: handleConfirm,
          disabled: isLoading,
        }}
      />
    </>
  );
};
