import { AddAssetsTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddAssets } from './useAddAssets';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddAssets = (props: SheetScreenProps<SheetRoutes.AddAssets>) => {
  const { accountId, blockchainName } = props.route.params;
  const { navigation } = props;
  const { labels, actions, values } = useAddAssets(accountId, blockchainName);
  const hasSelectedTokens = values.selectedTokens.length > 0;
  const hasSelectedNfts = values.selectedNfts
    ? Object.values(values.selectedNfts).some(selected => selected)
    : false;
  const isConfirmDisabled = !hasSelectedTokens && !hasSelectedNfts;

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={labels.headerTitle}
          testID="add-assets-sheet-header"
          leftIconOnPress={navigation.goBack}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: labels.cancelLabel,
            onPress: actions.onClose,
            testID: 'add-assets-cancel-button',
          }}
          primaryButton={{
            label: labels.confirmLabel,
            onPress: actions.onConfirm,
            disabled: isConfirmDisabled,
            testID: 'add-assets-confirm-button',
          }}
        />
      ),
    });
  }, [navigation, labels, actions, isConfirmDisabled]);

  return (
    <AddAssetsTemplate labels={labels} actions={actions} values={values} />
  );
};
