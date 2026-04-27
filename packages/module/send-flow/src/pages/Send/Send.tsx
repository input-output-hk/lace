import { SendSheet as SendSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useSendSheet } from './useSendSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const SendSheet = (props: SheetScreenProps<SheetRoutes.Send>) => {
  const { sendSheetProps } = useSendSheet(props);

  return <SendSheetTemplate {...sendSheetProps} />;
};
