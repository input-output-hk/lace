import { EditWalletSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useEditWallet } from './useEditWallet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const EditWalletSheet = (
  props: SheetScreenProps<SheetRoutes.EditWallet>,
) => {
  const { secondaryButton, primaryButton, ...templateProps } =
    useEditWallet(props);
  const { labels } = templateProps;

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={labels.title} />,
      footer: (
        <Sheet.Footer
          secondaryButton={secondaryButton}
          primaryButton={primaryButton}
        />
      ),
    });
  }, [props.navigation, labels.title, secondaryButton, primaryButton]);

  return <EditWalletSheetTemplate {...templateProps} />;
};
