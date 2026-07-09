import { FilterSheet, Sheet, SortPreferenceButton } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useBrowsePoolFiltersSheet } from './useBrowsePoolFiltersSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const BrowsePoolFiltersSheet = (
  props: SheetScreenProps<SheetRoutes.BrowsePoolFilterControls>,
) => {
  const { navigation } = props;
  const model = useBrowsePoolFiltersSheet(props.route.params);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={model.title}
          testID={`${model.testID}-header`}
          handleClose={navigation.goBack}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: model.cancelButtonLabel,
            onPress: model.onCancel,
            testID: `${model.testID}-cancel`,
          }}
          primaryButton={{
            label: model.confirmButtonLabel,
            onPress: model.onConfirm,
            testID: `${model.testID}-confirm`,
          }}
        />
      ),
    });
  }, [navigation, model]);

  return (
    <FilterSheet
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
      testID={model.testID}
    />
  );
};
