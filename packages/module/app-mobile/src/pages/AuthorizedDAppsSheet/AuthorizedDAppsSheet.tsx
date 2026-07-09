import { type SheetRoutes, type SheetScreenProps } from '@lace-lib/navigation';
import {
  AuthorizedDAppsSheet as AuthorizedDAppsSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAuthorizedDAppsSheet } from './useAuthorizedDAppsSheet';

export const AuthorizedDAppsSheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.AuthorizedDApps>) => {
  const {
    title,
    subtitle,
    browseButtonLabel,
    closeButtonLabel,
    emptyMessage,
    dApps,
    isBrowseButtonVisible,
    onBrowseDApps,
    onClose,
  } = useAuthorizedDAppsSheet();

  useEffect(() => {
    if (dApps.length === 0) {
      navigation.setOptions({ detents: ['auto'], scrollable: false });
    } else {
      navigation.setOptions({ detents: [1], scrollable: true });
    }
  }, [dApps.length]);

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          primaryButton={
            isBrowseButtonVisible
              ? {
                  label: browseButtonLabel,
                  onPress: onBrowseDApps,
                  testID: 'authorized-dapps-sheet-browse-button',
                }
              : undefined
          }
          secondaryButton={
            isBrowseButtonVisible
              ? undefined
              : {
                  label: closeButtonLabel,
                  onPress: onClose,
                  testID: 'authorized-dapps-sheet-close-button',
                }
          }
        />
      ),
    });
  }, [
    navigation,
    title,
    browseButtonLabel,
    closeButtonLabel,
    isBrowseButtonVisible,
    onBrowseDApps,
    onClose,
  ]);

  return (
    <AuthorizedDAppsSheetTemplate
      subtitle={subtitle}
      emptyMessage={emptyMessage}
      dApps={dApps}
    />
  );
};
