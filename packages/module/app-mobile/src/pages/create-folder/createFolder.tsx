import { type SheetScreenProps } from '@lace-lib/navigation';
import {
  CreateFolderSheet as CreateFolderSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useCreateFolder } from './useCreateFolder';

import type { SheetRoutes } from '@lace-lib/navigation';

export const CreateFolder = (
  props: SheetScreenProps<SheetRoutes.CreateFolder>,
) => {
  const { templateProps } = useCreateFolder(props);
  const { buttons, createFolderState, nfts, title } = templateProps;
  const isSelectingTokens = createFolderState.status === 'SelectingTokens';
  const isNamingFolder = createFolderState.status === 'NamingFolder';
  const hasFooter = isSelectingTokens || isNamingFolder;

  useEffect(() => {
    props.navigation.setOptions({
      detents: !isSelectingTokens ? ['auto'] : [1],
      scrollable: isSelectingTokens,
      header: <Sheet.Header title={title} />,
      footer: hasFooter ? (
        <Sheet.Footer
          showDivider={false}
          secondaryButton={{
            label: buttons.buttonSecondaryLabel,
            onPress: isSelectingTokens
              ? nfts.onClose
              : buttons.buttonSecondaryPress,
            testID: buttons.buttonSecondaryTestID,
          }}
          primaryButton={{
            label: buttons.buttonPrimaryLabel,
            onPress: isSelectingTokens
              ? nfts.onDone
              : buttons.buttonPrimaryPress,
            disabled: isNamingFolder ? buttons.disabled : false,
            testID: isSelectingTokens
              ? 'nft-folder-select-done-btn'
              : buttons.buttonPrimaryTestID,
          }}
        />
      ) : undefined,
    });
  }, [
    props.navigation,
    title,
    hasFooter,
    isSelectingTokens,
    isNamingFolder,
    buttons,
    nfts,
  ]);

  return <CreateFolderSheetTemplate {...templateProps} />;
};
