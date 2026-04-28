import { ComingSoonSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ComingSoonSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.ComingSoon>) => {
  const { featureName } = route.params;
  return <ComingSoonSheetTemplate featureName={featureName} />;
};
