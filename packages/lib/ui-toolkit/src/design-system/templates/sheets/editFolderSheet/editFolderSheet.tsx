import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { NftItemsList } from '../..';
import { spacing } from '../../../../design-tokens';
import {
  Text,
  Divider,
  Icon,
  IconButton,
  Column,
  CustomTextInput,
} from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { NftItem } from '../..';

interface FolderNameProps {
  folderName: string;
  onFolderNameChange: (name: string) => void;
  folderNameLabel?: string;
  inputLabel?: string;
  userInputFolderName: string;
  /** Shown under the input (e.g. duplicate name). */
  inputError?: string;
}

interface ButtonProps {
  buttonPrimaryLabel: string;
  buttonPrimaryPress: () => void;
  buttonSecondaryLabel: string;
  buttonSecondaryPress: () => void;
  buttonTertiaryLabel?: string;
  buttonPrimaryTestID?: string;
  buttonSecondaryTestID?: string;
  disabled?: boolean;
}

interface ActionProps {
  onUpdateNftsPress?: () => void;
  onDeleteFolderPress?: () => void;
  moreSettingsLabel?: string;
  updateNftsLabel?: string;
  isUpdateNftsDisabled?: boolean;
}

interface NftsProps {
  nfts: NftItem[];
  onToggleNftSelection: (index: number) => void;
  onClose: () => void;
  onDone: () => void;
  pickNftsLabel: string;
}

interface EditFolderSheetProps {
  folderName: FolderNameProps;
  buttons: ButtonProps;
  actions: ActionProps;
  nfts: NftsProps;
  title: string;
  editTokenFolderState: { status: string };
}

export const EditFolderSheet = ({
  folderName,
  buttons,
  actions,
  nfts,
  title,
  editTokenFolderState,
}: EditFolderSheetProps) => {
  const isSelectingTokens = editTokenFolderState.status === 'SelectingTokens';
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll contentContainerStyle={scrollContainerStyle}>
        {isSelectingTokens ? (
          <Column>
            <Column style={styles.nameColumn}>
              <Text.S>{nfts.pickNftsLabel}</Text.S>
              <NftItemsList
                nfts={nfts.nfts}
                onToggleNftSelection={nfts.onToggleNftSelection}
              />
            </Column>
          </Column>
        ) : (
          <Column>
            <Column style={styles.nameColumn}>
              <Text.S>{folderName.folderNameLabel}</Text.S>
              <CustomTextInput
                isWithinBottomSheet
                label={folderName.inputLabel}
                value={folderName.userInputFolderName}
                testID="edit-nft-folder-name-input"
                inputError={folderName.inputError}
                onChange={event => {
                  folderName.onFolderNameChange(event.nativeEvent.text);
                }}
              />
            </Column>
            <Divider />
            <Column style={styles.moreSettingsColumn}>
              <Text.M style={{ marginBottom: spacing.M }}>
                {actions.moreSettingsLabel}
              </Text.M>
              {actions.onUpdateNftsPress && (
                <IconButton.Static
                  label={{
                    position: 'right',
                    content: String(actions.updateNftsLabel),
                  }}
                  icon={<Icon name="ImageAdd" />}
                  testID="edit-nft-folder-update-nfts-btn"
                  onPress={actions.onUpdateNftsPress}
                  disabled={actions.isUpdateNftsDisabled}
                />
              )}
              {actions.onDeleteFolderPress && (
                <IconButton.Static
                  label={{
                    position: 'right',
                    content: String(buttons.buttonTertiaryLabel),
                  }}
                  testID="edit-nft-folder-delete-btn"
                  onPress={actions.onDeleteFolderPress}
                  icon={<Icon name="Delete" />}
                />
              )}
            </Column>
          </Column>
        )}
      </Sheet.Scroll>
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
          onPress: isSelectingTokens ? nfts.onDone : buttons.buttonPrimaryPress,
          disabled: isSelectingTokens ? false : buttons.disabled,
          testID: isSelectingTokens
            ? 'nft-folder-select-done-btn'
            : buttons.buttonPrimaryTestID,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  nameColumn: {
    marginTop: spacing.M,
    gap: spacing.S,
    marginBottom: spacing.S,
  },
  moreSettingsColumn: {
    marginTop: spacing.S,
    gap: spacing.S,
  },
});
