import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Button,
  Column,
  CustomTextInput,
  Row,
  Text,
  Sheet,
  SheetHeader,
  SheetFooter,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import { spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';
import type { Theme } from '@lace-lib/ui-toolkit';

const SLIPPAGE_PRESETS = [0.1, 0.5, 1, 2.5];
const MIN_SLIPPAGE = 0.1;
const MAX_SLIPPAGE = 50;
const MAX_INPUT_LENGTH = 10;
const NUMERIC_INPUT_REGEX = /^\d*\.?\d*$/;

export const SwapSlippage = (
  _props: SheetScreenProps<SheetRoutes.SwapSlippage>,
) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, footerHeight),
    [theme, footerHeight],
  );

  const currentSlippage = useLaceSelector('swapConfig.selectSlippage');
  const dispatchSetSlippage = useDispatchLaceAction('swapConfig.setSlippage');
  const { trackEvent } = useAnalytics();
  const [inputValue, setInputValue] = useState(String(currentSlippage));

  const handleInputChange = useCallback((value: string) => {
    if (value.length > MAX_INPUT_LENGTH) return;
    if (!NUMERIC_INPUT_REGEX.test(value)) return;
    setInputValue(value);
  }, []);

  const handlePresetPress = useCallback((value: number) => {
    setInputValue(String(value));
  }, []);

  const parsedSlippage =
    inputValue === '' ? Number.NaN : Number.parseFloat(inputValue);
  const isSlippageValid =
    !Number.isNaN(parsedSlippage) &&
    parsedSlippage >= MIN_SLIPPAGE &&
    parsedSlippage <= MAX_SLIPPAGE;
  const slippageError =
    inputValue !== '' && !isSlippageValid
      ? t('v2.swap.slippage.error')
      : undefined;

  const handleConfirm = useCallback(() => {
    if (!isSlippageValid) return;
    trackEvent('swaps | adjust slippage', {
      customSlippage: parsedSlippage.toString(),
    });
    dispatchSetSlippage(parsedSlippage);
    NavigationControls.sheets.close();
  }, [isSlippageValid, parsedSlippage, dispatchSetSlippage, trackEvent]);

  return (
    <>
      <SheetHeader title={t('v2.swap.slippage.title')} />
      <Sheet.Scroll
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        overScrollMode="never">
        <Text.XS variant="secondary">
          {t('v2.swap.slippage.description')}
        </Text.XS>
        <CustomTextInput
          value={inputValue}
          onChangeText={handleInputChange}
          keyboardType="decimal-pad"
          inputMode="decimal"
          maxLength={MAX_INPUT_LENGTH}
          placeholder={t('v2.swap.slippage.percentage')}
          inputError={slippageError}
          testID="swap-slippage-input"
        />
        <Row gap={spacing.S} justifyContent="space-between">
          {SLIPPAGE_PRESETS.map(preset => {
            const ButtonComponent =
              inputValue === String(preset) ? Button.Primary : Button.Secondary;
            return (
              <Column key={preset} style={{ flex: 1 }}>
                <ButtonComponent
                  size="small"
                  label={`${preset}%`}
                  onPress={() => {
                    handlePresetPress(preset);
                  }}
                />
              </Column>
            );
          })}
        </Row>
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: t('v2.swap.slippage.confirm'),
          onPress: handleConfirm,
          disabled: !isSlippageValid,
        }}
      />
    </>
  );
};

const getStyles = (_theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    container: {
      padding: spacing.M,
      gap: spacing.M,
      paddingBottom: footerHeight,
    },
  });
