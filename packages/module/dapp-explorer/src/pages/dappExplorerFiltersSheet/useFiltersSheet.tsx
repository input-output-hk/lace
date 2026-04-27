import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
} from '../../hooks/lace-context';
import { getDappCategoryLabel } from '../../util/text-utils';

import type { DappCategory } from '../../types';
import type { FilterSheetProps } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

export const useFiltersSheet = (): FilterSheetProps => {
  const { t } = useTranslation();
  const activeBlockchains = useLaceSelector('wallets.selectActiveBlockchains');
  const dappSearchParams = useLaceSelector('dappExplorer.getSearchParams');
  const dappCategories = useLaceSelector(
    'dappExplorer.getAvailableDappCategories',
  );

  const setSearchParams = useDispatchLaceAction('dappExplorer.setSearchParams');
  const resetSearchParams = useDispatchLaceAction(
    'dappExplorer.resetSearchParams',
  );
  const testID = 'dapp-explorer-filters-sheet';

  // Local state for temporary filter selections
  const [localChain, setLocalChain] = useState<BlockchainName | undefined>(
    dappSearchParams?.chain,
  );
  const [localCategory, setLocalCategory] = useState<DappCategory>(
    dappSearchParams?.category,
  );

  // Sync local state when search params change (e.g., when sheet opens)
  useEffect(() => {
    setLocalChain(dappSearchParams?.chain);
    setLocalCategory(dappSearchParams?.category);
  }, [dappSearchParams?.chain, dappSearchParams?.category]);

  // Auto-select blockchain if only one is available and none is currently selected
  useEffect(() => {
    if (
      activeBlockchains &&
      activeBlockchains.length === 1 &&
      dappSearchParams.chain === undefined
    ) {
      setSearchParams({ chain: activeBlockchains[0] });
    }
  }, [activeBlockchains, dappSearchParams.chain, setSearchParams]);

  const handleConfirm = () => {
    setSearchParams({
      chain: localChain,
      category: localCategory,
    });
    NavigationControls.sheets.close();
  };

  const handleCancel = () => {
    resetSearchParams();
    // Reset local state to match reset
    setLocalChain(undefined);
    setLocalCategory('show all');
  };

  const dropdowns = useMemo<FilterSheetProps['dropdowns']>(() => {
    const blockchains = activeBlockchains ?? [];
    const categories = dappCategories ?? [];

    return [
      {
        label: t('v2.dapp-explorer.filters.blockchain'),
        items: blockchains.map(chain => ({ text: chain, id: chain })),
        selectedItemId: localChain,
        onSelectItem: (index: number) => {
          const selectedChain = blockchains[index];
          if (selectedChain) setLocalChain(selectedChain);
        },
        testID: `${testID}-blockchain-dropdown`,
      },
      {
        label: t('v2.dapp-explorer.filters.category'),
        items: categories.map(category => ({
          text: getDappCategoryLabel(t, category),
          id: category,
        })),
        selectedItemId: localCategory,
        onSelectItem: (index: number) => {
          const selectedCategory = categories[index];
          if (selectedCategory) setLocalCategory(selectedCategory);
        },
        testID: `${testID}-category-dropdown`,
      },
    ];
  }, [activeBlockchains, dappCategories, localChain, localCategory, t]);

  return {
    title: t('v2.generic.sheet.header.filters'),
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    cancelButtonLabel: t('v2.generic.btn.clear'),
    confirmButtonLabel: t('v2.generic.btn.apply'),
    dropdowns,
    testID: testID,
  };
};
