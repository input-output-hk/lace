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
  const browsePoolProps = useBrowsePool(props.route.params);
  const { navigation } = props;
  const { t } = useTranslation();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={t('v2.pages.browse-pool.title')} />,
    });
  }, [navigation, t]);

  if (isWeb) {
    return <BrowsePoolTemplate {...browsePoolProps} />;
  }

  return <BrowsePoolSheetContent {...browsePoolProps} />;
};
