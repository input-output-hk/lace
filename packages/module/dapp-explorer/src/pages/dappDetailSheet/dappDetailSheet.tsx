import {
  DappDetailsSheet as DappDetailsSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useDappDetails } from './useDappDetails';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DappDetailSheet = (
  props: SheetScreenProps<SheetRoutes.DappDetail>,
) => {
  const { activeDapp } = props.route.params;
  const templateProps = useDappDetails(activeDapp);

  useEffect(() => {
    if (!templateProps) return;

    props.navigation.setOptions({
      header: <Sheet.Header title={templateProps.header.name} />,
      footer: (
        <Sheet.Footer
          primaryButton={templateProps.primaryButton}
          secondaryButton={templateProps.secondaryButton}
          testID={`${templateProps.testID ?? 'dapp-details-sheet'}-footer`}
        />
      ),
    });
  }, [props.navigation, templateProps]);

  if (!templateProps) return null;
  return <DappDetailsSheetTemplate {...templateProps} />;
};
