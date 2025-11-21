import React, { useState, useCallback, useEffect, useRef, ReactElement } from 'react';
import { Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerHeader, DrawerNavigation, Switch, PostHogAction } from '@lace/common';
import { SwapStage } from '../../types';
import { useSwaps } from '../SwapProvider';
import { useTranslation } from 'react-i18next';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const LiquiditySourcesDrawer = (): ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHogClientContext();
  const { stage, setStage, setExcludedDexs, dexList, excludedDexs } = useSwaps();

  const [localExcludedDexs, setLocalExcludedDexs] = useState(excludedDexs);

  const isDrawerOpen = stage === SwapStage.SelectLiquiditySources;

  // Sync localExcludedDexs with excludedDexs when drawer opens
  // Use a ref to track previous drawer state to detect transitions
  const prevDrawerOpenRef = useRef(false);
  useEffect(() => {
    // Only sync when drawer transitions from closed to open
    if (isDrawerOpen && !prevDrawerOpenRef.current) {
      setLocalExcludedDexs(excludedDexs);
    }
    prevDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen, excludedDexs]);
  const handleConfirmDexChoices = useCallback(() => {
    setExcludedDexs(localExcludedDexs);
    posthog.sendEvent(PostHogAction.SwapsAdjustSources, {
      excludedDexs: localExcludedDexs
    });
    setStage(SwapStage.Initial);
  }, [localExcludedDexs, setExcludedDexs, setStage, posthog]);

  return (
    <Drawer
      open={isDrawerOpen}
      maskClosable
      onClose={() => setStage(SwapStage.Initial)}
      title={<DrawerHeader title={t('swaps.liquiditySourcesDrawer.heading')} />}
      navigation={
        <DrawerNavigation
          title={t('swaps.liquiditySourcesDrawer.title')}
          onCloseIconClick={() => setStage(SwapStage.Initial)}
        />
      }
      dataTestId="swap-liquidity-sources-drawer"
      footer={
        <Button.CallToAction
          disabled={localExcludedDexs.length === dexList.length}
          w={'$fill'}
          label={t('general.button.confirm')}
          onClick={handleConfirmDexChoices}
        />
      }
    >
      <Flex mb={'$24'} flexDirection="column" gap={'$8'}>
        <Text.Body.Normal>{t('swaps.liquiditySourcesDrawer.subtitle')}</Text.Body.Normal>
        <Flex flexDirection={'column'} w="$fill" gap={'$16'}>
          {dexList.length > 0 &&
            dexList.map((dex) => (
              <Flex key={dex} w={'$fill'} justifyContent={'space-between'}>
                <Text.Body.Normal weight="$semibold">{dex}</Text.Body.Normal>
                <Switch
                  checked={!localExcludedDexs?.includes(dex)}
                  onChange={(checked) =>
                    checked
                      ? setLocalExcludedDexs(localExcludedDexs.filter((d) => d !== dex))
                      : setLocalExcludedDexs([...localExcludedDexs, dex])
                  }
                  testId={`dex-switch-${dex}`}
                />
              </Flex>
            ))}
        </Flex>
      </Flex>
    </Drawer>
  );
};
