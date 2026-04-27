import React, { useMemo } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';

import { NftItemsList } from '../..';
import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

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
  buttons: ButtonProps;
  nfts: NftsProps;
  title: string;
  createFolderState: { status: string };
  theme: Theme;
  numberOfColumns: number;
}

export const CreateFolderSheet = ({
  folderName,
  buttons,
  nfts,
  title,
  createFolderState,
  theme,
  numberOfColumns,
}: CreateFolderSheetProps) => {
  const isSelectingTokens = createFolderState.status === 'SelectingTokens';
  const isNamingFolder = createFolderState.status === 'NamingFolder';
  const hasFooter = isSelectingTokens || isNamingFolder;
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(hasFooter ? footerHeight : 0),
    [hasFooter, footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll contentContainerStyle={styles.contentContainer}>
        {isSelectingTokens ? (
          <Column gap={spacing.S}>
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
              isWithinBottomSheet
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
      {hasFooter && (
        <SheetFooter
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
      )}
    </>
  );
};

const getStyles = (paddingBottom: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom,
    },
    nameColumn: {
      marginTop: spacing.XXL,
    },
  });
