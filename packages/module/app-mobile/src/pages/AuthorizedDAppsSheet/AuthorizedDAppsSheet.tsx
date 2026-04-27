import { type SheetRoutes, type SheetScreenProps } from '@lace-lib/navigation';
import { AuthorizedDAppsSheet as AuthorizedDAppsSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAuthorizedDAppsSheet } from './useAuthorizedDAppsSheet';

export const AuthorizedDAppsSheet = (
  props: SheetScreenProps<SheetRoutes.AuthorizedDApps>,
) => {
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
  } = useAuthorizedDAppsSheet(props);

  return (
    <AuthorizedDAppsSheetTemplate
      title={title}
      subtitle={subtitle}
      emptyMessage={emptyMessage}
      browseButtonLabel={browseButtonLabel}
      closeButtonLabel={closeButtonLabel}
      dApps={dApps}
      onBrowseDApps={onBrowseDApps}
      onClose={onClose}
      showBrowseButton={isBrowseButtonVisible}
    />
  );
};
