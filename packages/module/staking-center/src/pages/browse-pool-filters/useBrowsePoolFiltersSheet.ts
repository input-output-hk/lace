import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  BROWSE_POOL_OPTIONS,
  getDefaultSortOrder,
  getOption,
  OPTIONS,
  ORDERS,
} from '@lace-lib/ui-toolkit';
import { useEffect, useMemo, useState } from 'react';

import type { TranslationKey } from '@lace-contract/i18n';
import type { BrowsePoolSortOption } from '@lace-contract/staking-center';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { BrowsePoolSortOrder } from '@lace-lib/ui-toolkit';

const isSortOrder = (value: unknown): value is BrowsePoolSortOrder =>
  value === ORDERS.ASC || value === ORDERS.DESC;

const OPTION_LABEL_KEYS = {
  ticker: 'v2.pages.browse-pool.more-options.ticker',
  saturation: 'v2.pages.browse-pool.more-options.saturation',
  cost: 'v2.pages.browse-pool.more-options.cost',
  margin: 'v2.pages.browse-pool.more-options.margin',
  blocks: 'v2.pages.browse-pool.more-options.blocks',
  pledge: 'v2.pages.browse-pool.more-options.pledge',
  liveStake: 'v2.pages.browse-pool.more-options.liveStake',
} satisfies Record<BrowsePoolSortOption, TranslationKey>;

const SORT_BY_LABEL_KEY: TranslationKey =
  'v2.pages.browse-pool.more-options.sort-by';

export type BrowsePoolFiltersSheetModel = {
  title: string;
  testID: string;
  cancelButtonLabel: string;
  confirmButtonLabel: string;
  dropdownLabel: string;
  dropdownItems: Array<{ id: BrowsePoolSortOption; text: string }>;
  selectedOption?: BrowsePoolSortOption;
  selectedOrder: BrowsePoolSortOrder;
  onSelectOption: (index: number) => void;
  onClearOption: () => void;
  onToggleOrder: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const useBrowsePoolFiltersSheet = (
  params: SheetScreenProps<SheetRoutes.BrowsePoolFilterControls>['route']['params'],
): BrowsePoolFiltersSheetModel => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const testID = 'browse-pool-filters-sheet';

  const resolvedOption = getOption(params.browsePoolSortOption) ?? undefined;
  const resolvedOrder: BrowsePoolSortOrder | undefined = isSortOrder(
    params.browsePoolSortOrder,
  )
    ? params.browsePoolSortOrder
    : undefined;

  const [localOption, setLocalOption] = useState<
    BrowsePoolSortOption | undefined
  >(resolvedOption);
  const [localOrder, setLocalOrder] = useState<BrowsePoolSortOrder>(() => {
    if (resolvedOption)
      return resolvedOrder ?? getDefaultSortOrder(resolvedOption);
    return ORDERS.ASC;
  });

  useEffect(() => {
    setLocalOption(resolvedOption);
    if (resolvedOption) {
      setLocalOrder(resolvedOrder ?? getDefaultSortOrder(resolvedOption));
    }
  }, [resolvedOption, resolvedOrder]);

  const dropdownItems = useMemo<
    Array<{ id: BrowsePoolSortOption; text: string }>
  >(
    () =>
      BROWSE_POOL_OPTIONS.map(id => ({
        id,
        text: t(OPTION_LABEL_KEYS[id]),
      })),
    [t],
  );

  const navigate = (option?: BrowsePoolSortOption) => {
    NavigationControls.sheets.navigate(
      SheetRoutes.BrowsePool,
      {
        accountId: params.accountId,
        searchQuery: params.searchQuery,
        browsePoolSortOption: option,
        browsePoolSortOrder: option ? localOrder : undefined,
      },
      { reset: true },
    );
  };

  return {
    title: t('v2.pages.browse-pool.filter.more-options'),
    testID,
    cancelButtonLabel: t('v2.generic.btn.clear'),
    confirmButtonLabel: t('v2.generic.btn.apply'),

    dropdownLabel: t(SORT_BY_LABEL_KEY),
    dropdownItems,
    selectedOption: localOption,
    selectedOrder: localOption
      ? localOrder
      : getDefaultSortOrder(OPTIONS.TICKER),

    onSelectOption: (index: number) => {
      const option = BROWSE_POOL_OPTIONS[index];
      if (!option) return;
      setLocalOption(option);
      setLocalOrder(getDefaultSortOrder(option));
    },
    onClearOption: () => {
      setLocalOption(undefined);
      setLocalOrder(ORDERS.ASC);
    },
    onToggleOrder: () => {
      if (!localOption) return;
      setLocalOrder(previous =>
        previous === ORDERS.ASC ? ORDERS.DESC : ORDERS.ASC,
      );
    },

    onConfirm: () => {
      if (localOption) {
        trackEvent('staking | pool | sort | press', { sortBy: localOption });
      }
      navigate(localOption);
    },
    onCancel: () => {
      setLocalOption(undefined);
      navigate(undefined);
    },
  };
};
