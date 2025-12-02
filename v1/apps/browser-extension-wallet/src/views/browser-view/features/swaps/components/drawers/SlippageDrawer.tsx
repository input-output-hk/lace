/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Drawer, DrawerNavigation, PostHogAction } from '@lace/common';
import { Button, Flex, Text, TextBox } from '@input-output-hk/lace-ui-toolkit';

import { useSwaps } from '../SwapProvider';

import { SwapStage } from '../../types';
import { useTranslation } from 'react-i18next';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

const MIN_SLIPPAGE_PERCENTAGE = 0.1;
const MAX_INPUT_LENGTH = 10;

export const SwapSlippageDrawer = (): ReactElement => {
  const { t } = useTranslation();
  const { targetSlippage, setTargetSlippage, stage, setStage, slippagePercentages, maxSlippagePercentage } = useSwaps();
  const [slippageError, setSlippageError] = useState<boolean>(false);
  const [innerSlippage, setInnerSlippage] = useState(targetSlippage);
  const [inputValue, setInputValue] = useState<string>(targetSlippage.toString());
  const posthog = usePostHogClientContext();

  const isDrawerOpen = stage === SwapStage.AdjustSlippage;

  // Sync innerSlippage with targetSlippage when drawer opens and reset error state
  // Only sync when drawer transitions from closed to open, not on every targetSlippage change
  // Use a ref to track previous drawer state to detect transitions
  const prevDrawerOpenRef = useRef(false);
  useEffect(() => {
    // Only sync when drawer transitions from closed to open
    if (isDrawerOpen && !prevDrawerOpenRef.current) {
      setInnerSlippage(targetSlippage);
      setInputValue(targetSlippage.toString());
      setSlippageError(false);
    }
    prevDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen, targetSlippage]);

  const handleCustomSlippageChange = (event: Readonly<React.ChangeEvent<HTMLInputElement>>) => {
    const newInputValue = event.target.value;
    setSlippageError(false);

    // Allow empty string
    if (newInputValue === '') {
      setInputValue('');
      setInnerSlippage(0);
      return;
    }

    // Prevent excessively long input
    if (newInputValue.length > MAX_INPUT_LENGTH) {
      return;
    }

    // Allow only valid numeric input: digits and at most one decimal point
    // Use simple checks to avoid regex backtracking issues
    const decimalCount = (newInputValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      // Multiple decimal points not allowed
      return;
    }

    // Check if all characters are digits or a decimal point
    // eslint-disable-next-line wrap-regex
    if (!/^[\d.]+$/.test(newInputValue)) {
      // Contains invalid characters
      return;
    }

    // Update the input value to allow typing "0", "0.", "0.5", etc.
    setInputValue(newInputValue);

    // Convert to number for validation and storage
    const numValue = Number(newInputValue);

    // If it's a valid number, update innerSlippage
    if (!Number.isNaN(numValue)) {
      setInnerSlippage(numValue);

      // Show error if value exceeds maximum
      // Don't show error for values less than min while typing, as user might be entering a decimal
      if (numValue > maxSlippagePercentage) {
        setSlippageError(true);
      }
    } else if (newInputValue === '.') {
      // Allow typing just "." as intermediate state
      setInnerSlippage(0);
    }
    // Note: We don't validate against MIN_SLIPPAGE_PERCENTAGE here to allow typing intermediate values
    // Final validation happens in handleSaveSlippage
  };

  const validateSlippage = useCallback(
    (value: number): boolean => {
      const isValid = !Number.isNaN(value) && value >= MIN_SLIPPAGE_PERCENTAGE && value <= maxSlippagePercentage;

      setSlippageError(!isValid);
      return isValid;
    },
    [maxSlippagePercentage]
  );

  const handleSaveSlippage = () => {
    // Validate before saving
    if (!validateSlippage(innerSlippage)) {
      return;
    }

    setTargetSlippage(innerSlippage);
    posthog.sendEvent(PostHogAction.SwapsAdjustSlippage, { customSlippage: innerSlippage.toString() });
    setStage(SwapStage.Initial);
  };

  const isSlippageValid = useMemo(() => validateSlippage(innerSlippage), [innerSlippage, validateSlippage]);

  return (
    <Drawer
      open={isDrawerOpen}
      footer={
        <Button.CallToAction
          disabled={!isSlippageValid}
          w={'$fill'}
          label={t('general.button.confirm')}
          onClick={handleSaveSlippage}
        />
      }
      maskClosable
      onClose={() => setStage(SwapStage.Initial)}
      navigation={
        <DrawerNavigation title={t('swaps.pageHeading')} onCloseIconClick={() => setStage(SwapStage.Initial)} />
      }
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
            value={inputValue}
            onChange={handleCustomSlippageChange}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
          />
          <Flex gap="$8">
            {slippagePercentages.map((suggestedPercentage) => {
              const Component = innerSlippage === suggestedPercentage ? Button.CallToAction : Button.Secondary;
              return (
                <Component
                  w={'$fill'}
                  key={`suggested-percentage-${suggestedPercentage}`}
                  onClick={() => {
                    setInnerSlippage(suggestedPercentage);
                    setInputValue(suggestedPercentage.toString());
                    setSlippageError(false); // Clear error when selecting a suggested value
                  }}
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
