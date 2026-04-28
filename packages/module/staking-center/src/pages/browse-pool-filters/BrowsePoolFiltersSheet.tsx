import { FilterSheet, SortPreferenceButton } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useBrowsePoolFiltersSheet } from './useBrowsePoolFiltersSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const BrowsePoolFiltersSheet = (
  props: SheetScreenProps<SheetRoutes.BrowsePoolFilterControls>,
) => {
  const model = useBrowsePoolFiltersSheet(props.route.params);

  return (
    <FilterSheet
      title={model.title}
      dropdowns={[
        {
          label: model.dropdownLabel,
          rightNode: (
            <SortPreferenceButton
              option={model.selectedOption}
              order={model.selectedOrder}
              onToggleOrder={model.onToggleOrder}
              testID={`${model.testID}-sort-order-toggle`}
            />
          ),
          items: model.dropdownItems,
          selectedItemId: model.selectedOption,
          onSelectItem: model.onSelectOption,
          onClear: model.onClearOption,
          testID: `${model.testID}-sort-by-dropdown`,
        },
      ]}
      onConfirm={model.onConfirm}
      onCancel={model.onCancel}
      cancelButtonLabel={model.cancelButtonLabel}
      confirmButtonLabel={model.confirmButtonLabel}
      testID={model.testID}
    />
  );
};
