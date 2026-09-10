import { NavigationControls } from '@lace-lib/navigation';
import { ORDERS } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import {
  getAvailableTokenSortOptions,
  getDefaultTokenSortOrder,
  resolveTokenSortOption,
} from './utils/portfolioSort';

import type {
  TokenSortOption,
  TokenSortOrder,
  TokenSortPreference,
} from './utils/portfolioSort';

export const usePortfolioTokenSortSheet = (isTokenPricingEnabled: boolean) => {
  const { option: persistedOption, order: persistedOrder } =
    useLaceSelector('ui.getTokenSort');
  const setTokenSort = useDispatchLaceAction('ui.setTokenSort');

  const tokenSortOptions = useMemo(
    () => getAvailableTokenSortOptions(isTokenPricingEnabled),
    [isTokenPricingEnabled],
  );

  const resolvedOption = resolveTokenSortOption(
    persistedOption,
    isTokenPricingEnabled,
  );
  const resolvedOrder = resolvedOption ? persistedOrder : ORDERS.ASC;

  const [localOption, setLocalOption] = useState<TokenSortOption | undefined>(
    resolvedOption,
  );
  const [localOrder, setLocalOrder] = useState<TokenSortOrder>(resolvedOrder);

  // Apply/Clear reach the user through `navigation.setOptions`, so they must stay
  // referentially stable or the footer republishes on every draft change (ADR 31).
  // The ref is what reconciles that with committing the latest draft: keep it, or
  // a press arriving on an earlier-published handler commits a stale selection.
  const draftRef = useRef<TokenSortPreference>({
    option: resolvedOption,
    order: resolvedOrder,
  });

  const seedRef = useRef<TokenSortPreference>({
    option: resolvedOption,
    order: resolvedOrder,
  });

  useEffect(() => {
    setLocalOption(resolvedOption);
    setLocalOrder(resolvedOrder);
    seedRef.current = { option: resolvedOption, order: resolvedOrder };
  }, [resolvedOption, resolvedOrder]);

  useEffect(() => {
    draftRef.current = { option: localOption, order: localOrder };
  }, [localOption, localOrder]);

  // The seed is the stored preference narrowed to this network, so committing one
  // equal to it would overwrite an explicit choice (e.g. a mainnet 'value' sort)
  // the user never revisited — the narrowing is not theirs to persist.
  const applyTokenSort = useCallback(
    (preference: TokenSortPreference) => {
      const seed = seedRef.current;
      if (
        preference.option !== seed.option ||
        preference.order !== seed.order
      ) {
        setTokenSort(preference);
      }
      NavigationControls.closeSheet();
    },
    [setTokenSort],
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
    applyTokenSort({ option: undefined, order: ORDERS.ASC });
  }, [applyTokenSort]);

  const handleToggleOrder = useCallback(() => {
    if (!localOption) return;
    setLocalOrder(previous =>
      previous === ORDERS.ASC ? ORDERS.DESC : ORDERS.ASC,
    );
  }, [localOption]);

  const handleConfirm = useCallback(() => {
    applyTokenSort(draftRef.current);
  }, [applyTokenSort]);

  return {
    tokenSortOptions,
    localOption,
    localOrder,
    handleSelectOption,
    handleClear,
    handleClearAndApply,
    handleToggleOrder,
    handleConfirm,
  };
};
