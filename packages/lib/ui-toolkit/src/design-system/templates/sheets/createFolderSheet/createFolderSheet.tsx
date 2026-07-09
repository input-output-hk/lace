import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';

import { NftItemsList } from '../..';
import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { Sheet, footerHeight } from '../../../organisms';

import type { NftItem } from '../..';
import type { Theme } from '../../../../design-tokens';

interface FolderNameProps {
  folderName: string;
  onFolderNameChange: (name: string) => void;
  folderNameLabel?: string;
  inputLabel?: string;
  /** Shown under the input (e.g. duplicate name). */
  inputError?: string;
}

interface ButtonProps {
  buttonPrimaryLabel: string;
  buttonPrimaryPress: () => void;
  buttonSecondaryLabel: string;
  buttonSecondaryPress: () => void;
  buttonPrimaryTestID?: string;
  buttonSecondaryTestID?: string;
  disabled?: boolean;
}

interface NftsProps {
  nfts: NftItem[];
  onToggleNftSelection: (index: number) => void;
  onClose: () => void;
  onDone: () => void;
  pickNftsLabel: string;
}

interface CreateFolderSheetProps {
  folderName: FolderNameProps;
  buttons?: ButtonProps;
  nfts: NftsProps;
  createFolderState: { status: string };
  theme: Theme;
  numberOfColumns: number;
}

export const CreateFolderSheet = ({
  folderName,
  nfts,
  createFolderState,
  theme,
  numberOfColumns,
}: CreateFolderSheetProps) => {
  const isSelectingTokens = createFolderState.status === 'SelectingTokens';
  const isNamingFolder = createFolderState.status === 'NamingFolder';

  return (
    <Sheet.Scroll>
      {isSelectingTokens ? (
        <Column style={styles.contentContainer}>
          <NftItemsList
            nfts={nfts.nfts}
            onToggleNftSelection={nfts.onToggleNftSelection}
            numberOfColumns={numberOfColumns}
          />
        </Column>
      ) : isNamingFolder ? (
        <Column
          justifyContent="center"
          gap={spacing.M}
          style={styles.nameColumn}>
          <CustomTextInput
            label={folderName.inputLabel}
            value={folderName.folderName}
            testID="nft-folder-name-input"
            inputError={folderName.inputError}
            onChange={event => {
              folderName.onFolderNameChange(event.nativeEvent.text);
            }}
            animatedLabel
          />
        </Column>
      ) : (
        <ActivityIndicator size={30} color={theme.background.primary} />
      )}
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: footerHeight.horizontal,
  },
  nameColumn: {
    marginTop: spacing.XXL,
    marginHorizontal: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
});
