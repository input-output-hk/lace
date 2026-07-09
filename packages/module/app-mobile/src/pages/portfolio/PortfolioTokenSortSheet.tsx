import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import {
  FilterSheet,
  ORDERS,
  Sheet,
  SortPreferenceButton,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getDefaultTokenSortOrder,
  getTokenSortOption,
  getTokenSortOrder,
  TOKEN_SORT_OPTIONS,
  type TokenSortOption,
  type TokenSortOrder,
} from './utils/portfolioSort';

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

  const tokenSortOptions = useMemo<readonly TokenSortOption[]>(
    () =>
      isTokenPricingEnabled
        ? TOKEN_SORT_OPTIONS
        : TOKEN_SORT_OPTIONS.filter(option => option !== 'value'),
    [isTokenPricingEnabled],
  );

  const routeTokenSortOption = getTokenSortOption(
    route.params?.tokenSortOption,
  );
  const resolvedOption = tokenSortOptions.some(
    option => option === routeTokenSortOption,
  )
    ? routeTokenSortOption
    : undefined;
  const resolvedOrder = getTokenSortOrder(
    route.params?.tokenSortOrder,
    resolvedOption,
  );

  const [localOption, setLocalOption] = useState<TokenSortOption | undefined>(
    resolvedOption,
  );
  const [localOrder, setLocalOrder] = useState<TokenSortOrder>(resolvedOrder);

  useEffect(() => {
    setLocalOption(resolvedOption);
    setLocalOrder(resolvedOrder);
  }, [resolvedOption, resolvedOrder]);

  const dropdownItems = useMemo(
    () =>
      tokenSortOptions.map(id => ({
        id,
        text: t(OPTION_LABEL_KEYS[id]),
      })),
    [t, tokenSortOptions],
  );

  const navigateToPortfolio = useCallback(
    (option: TokenSortOption | undefined, order: TokenSortOrder) => {
      NavigationControls.navigate(StackRoutes.Home, {
        screen: TabRoutes.Portfolio,
        params: {
          tokenSortOption: option,
          tokenSortOrder: option ? order : undefined,
        },
      });
    },
    [],
  );

  const handleSelectOption = useCallback(
    (index: number) => {
      const option = tokenSortOptions[index];
      if (!option) return;

      setLocalOption(option);
      setLocalOrder(getDefaultTokenSortOrder(option));
    },
    [tokenSortOptions],
  );

  const handleClear = useCallback(() => {
    setLocalOption(undefined);
    setLocalOrder(ORDERS.ASC);
  }, []);

  const handleClearAndApply = useCallback(() => {
    navigateToPortfolio(undefined, localOrder);
  }, [localOrder, navigateToPortfolio]);

  const handleToggleOrder = useCallback(() => {
    if (!localOption) return;
    setLocalOrder(previous =>
      previous === ORDERS.ASC ? ORDERS.DESC : ORDERS.ASC,
    );
  }, [localOption]);

  const handleConfirm = useCallback(() => {
    navigateToPortfolio(localOption, localOrder);
  }, [localOption, localOrder, navigateToPortfolio]);

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
