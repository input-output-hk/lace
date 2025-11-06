/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement, useState, useEffect } from 'react';
import { Drawer, PostHogAction } from '@lace/common';
import { Button, Flex, Text, TextBox } from '@input-output-hk/lace-ui-toolkit';

import { useSwaps } from '../SwapProvider';

import { SwapStage } from '../../types';
import { useTranslation } from 'react-i18next';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const SwapSlippageDrawer = (): ReactElement => {
  const { t } = useTranslation();
  const { targetSlippage, setTargetSlippage, stage, setStage, slippagePercentages, maxSlippagePercentage } = useSwaps();
  const [slippageError, setSlippageError] = useState<boolean>(false);
  const [innerSlippage, setInnerSlippage] = useState(targetSlippage);
  const posthog = usePostHogClientContext();

  const isDrawerOpen = stage === SwapStage.AdjustSlippage;

  // Sync innerSlippage with targetSlippage when drawer opens and reset error state
  // Only sync when drawer transitions from closed to open, not on every targetSlippage change
  // Use a ref to track previous drawer state to detect transitions
  const prevDrawerOpenRef = React.useRef(false);
  useEffect(() => {
    // Only sync when drawer transitions from closed to open
    if (isDrawerOpen && !prevDrawerOpenRef.current) {
      setInnerSlippage(targetSlippage);
      setSlippageError(false);
    }
    prevDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen, targetSlippage]);

  const handleCustomSlippageChange = (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => {
    const inputValue = event.target.value;
    setSlippageError(false);

    // Handle empty string - allow it for better UX while typing
    if (inputValue === '') {
      setInnerSlippage(0);
      return;
    }

    const numValue = Number(inputValue);

    // Validate: must be a valid number and positive
    if (Number.isNaN(numValue) || numValue < 0) {
      setSlippageError(true);
      return;
    }

    if (numValue > maxSlippagePercentage) {
      setSlippageError(true);
      setInnerSlippage(numValue);
      return;
    }

    setInnerSlippage(numValue);
  };

  const handleSaveSlippage = () => {
    // Validate before saving
    if (Number.isNaN(innerSlippage) || innerSlippage <= 0 || innerSlippage > maxSlippagePercentage) {
      setSlippageError(true);
      return;
    }

    setTargetSlippage(innerSlippage);
    posthog.sendEvent(PostHogAction.SwapsAdjustSlippage, { customSlippage: innerSlippage.toString() });
    setStage(SwapStage.Initial);
  };

  return (
    <Drawer
      open={isDrawerOpen}
      footer={<Button.CallToAction w={'$fill'} label={t('general.button.confirm')} onClick={handleSaveSlippage} />}
      maskClosable
    >
      <Flex flexDirection={'column'} w="$fill" gap={'$28'}>
        <Flex flexDirection={'column'} gap="$8" w={'$fill'}>
          <Text.SubHeading>{t('swaps.slippage.drawerHeading')}</Text.SubHeading>
          <Text.Body.Normal>{t('swaps.slippage.drawerSubHeading')}</Text.Body.Normal>
        </Flex>
        <Flex flexDirection={'row'} gap="$16" justifyContent={'space-between'} w="$fill" alignItems={'center'}>
          <TextBox
            containerStyle={{ flex: 1 }}
            style={{ flex: 1 }}
            w="$fill"
            label={t('swaps.slippage.customAmountLabel')}
            value={innerSlippage > 0 ? innerSlippage.toString() : ''}
            onChange={handleCustomSlippageChange}
            type="number"
          />
          <Flex gap="$8">
            {slippagePercentages.map((suggestedPercentage) => {
              const Component = innerSlippage === suggestedPercentage ? Button.CallToAction : Button.Secondary;
              return (
                <Component
                  w={'$fill'}
                  key={`suggested-percentage-${suggestedPercentage}`}
                  onClick={() => setInnerSlippage(suggestedPercentage)}
                  label={`${suggestedPercentage.toString()}%`}
                  style={{ minWidth: 'unset' }}
                />
              );
            })}
          </Flex>
        </Flex>
        {slippageError && <Text.Body.Small color="error">{t('swaps.slippage.error')}</Text.Body.Small>}
      </Flex>
    </Drawer>
  );
};
