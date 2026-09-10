import { useTranslation } from '@lace-contract/i18n';
import {
  BrowsePoolSheetContent,
  BrowsePoolTemplate,
  isWeb,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useBrowsePool } from './useBrowsePool';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const BrowsePoolSheet = (
  props: SheetScreenProps<SheetRoutes.BrowsePool>,
) => {
  const { isSelecting, ...browsePoolProps } = useBrowsePool(props.route.params);
  const { navigation } = props;
  const { t } = useTranslation();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          // Titled as the decision it is when a flow sent the user here to
          // pick, rather than as a place they chose to browse.
          title={t(
            isSelecting
              ? 'v2.pages.browse-pool.select-title'
              : 'v2.pages.browse-pool.title',
          )}
        />
      ),
    });
  }, [navigation, t, isSelecting]);

  if (isWeb) {
    return <BrowsePoolTemplate {...browsePoolProps} />;
  }

  return <BrowsePoolSheetContent {...browsePoolProps} />;
};
