import { type SheetScreenProps } from '@lace-lib/navigation';
import { CreateFolderSheet as CreateFolderSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCreateFolder } from './useCreateFolder';

import type { SheetRoutes } from '@lace-lib/navigation';

export const CreateFolder = (
  props: SheetScreenProps<SheetRoutes.CreateFolder>,
) => {
  const { templateProps } = useCreateFolder(props);

  return <CreateFolderSheetTemplate {...templateProps} />;
};
