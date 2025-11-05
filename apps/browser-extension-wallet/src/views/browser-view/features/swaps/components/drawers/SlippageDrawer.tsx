/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement, useState } from 'react';
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

  const handleCustomSlippageChange = (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => {
    setSlippageError(false);
    if (Number(event.target.value) > maxSlippagePercentage) {
      setSlippageError(true);
    }
    setInnerSlippage(Number(event.target.value));
  };

  const handleSaveSlippage = () => {
    setTargetSlippage(innerSlippage);
    posthog.sendEvent(PostHogAction.SwapsAdjustSlippage, { customSlippage: innerSlippage.toString() });
    setStage(SwapStage.Initial);
  };

  return (
    <Drawer
      open={stage === SwapStage.AdjustSlippage}
      footer={<Button.CallToAction w={'$fill'} label="confirm" onClick={handleSaveSlippage} />}
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
            value={innerSlippage?.toString()}
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
