import { useTranslation } from '@lace-contract/i18n';
import { FilterSheet, Sheet, SortPreferenceButton } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { usePortfolioTokenSortSheet } from './usePortfolioTokenSortSheet';

import type { TokenSortOption } from './utils/portfolioSort';
import type { TranslationKey } from '@lace-contract/i18n';
import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';

const OPTION_LABEL_KEYS = {
  quantity: 'v2.portfolio.tokens.sort.quantity',
  value: 'v2.portfolio.tokens.sort.value',
  ticker: 'v2.portfolio.tokens.sort.ticker',
} satisfies Record<TokenSortOption, TranslationKey>;

export const PortfolioTokenSortSheet = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.PortfolioTokenSortControls>) => {
  const { t } = useTranslation();
  const testID = 'portfolio-token-sort-sheet';
  const isTokenPricingEnabled = route.params?.isTokenPricingEnabled ?? true;

  const {
    tokenSortOptions,
    localOption,
    localOrder,
    handleSelectOption,
    handleClear,
    handleClearAndApply,
    handleToggleOrder,
    handleConfirm,
  } = usePortfolioTokenSortSheet(isTokenPricingEnabled);

  const dropdownItems = useMemo(
    () =>
      tokenSortOptions.map(id => ({
        id,
        text: t(OPTION_LABEL_KEYS[id]),
      })),
    [t, tokenSortOptions],
  );

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('v2.portfolio.tokens.sort.title')}
          testID={`${testID}-header`}
          handleClose={navigation.goBack}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: t('v2.generic.btn.clear'),
            onPress: handleClearAndApply,
            testID: `${testID}-clear`,
          }}
          primaryButton={{
            label: t('v2.generic.btn.apply'),
            onPress: handleConfirm,
            testID: `${testID}-apply`,
          }}
        />
      ),
    });
  }, [handleClearAndApply, handleConfirm, navigation, t]);

  return (
    <FilterSheet
      dropdowns={[
        {
          label: t('v2.generic.btn.sortBy'),
          rightNode: (
            <SortPreferenceButton
              option={localOption}
              order={localOrder}
              onToggleOrder={handleToggleOrder}
              testID={`${testID}-sort-order-toggle`}
            />
          ),
          items: dropdownItems,
          selectedItemId: localOption,
          onSelectItem: handleSelectOption,
          onClear: handleClear,
          testID: `${testID}-sort-by-dropdown`,
        },
      ]}
      testID={testID}
    />
  );
};
