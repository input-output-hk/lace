import React from 'react';
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
import { Sheet, footerHeight } from '../../../organisms';

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
  editTokenFolderState: { status: string };
}

export const EditFolderSheet = ({
  folderName,
  buttons,
  actions,
  nfts,
  editTokenFolderState,
}: EditFolderSheetProps) => {
  const isSelectingTokens = editTokenFolderState.status === 'SelectingTokens';

  return (
    <Sheet.Scroll>
      {isSelectingTokens ? (
        <Column gap={spacing.M} style={styles.contentContainer}>
          <Text.S>{nfts.pickNftsLabel}</Text.S>
          <NftItemsList
            nfts={nfts.nfts}
            onToggleNftSelection={nfts.onToggleNftSelection}
          />
        </Column>
      ) : (
        <Column gap={spacing.M} style={styles.editFolderContentContainer}>
          <Column style={styles.nameColumn}>
            <Text.S>{folderName.folderNameLabel}</Text.S>
            <CustomTextInput
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
          <Column gap={spacing.M} style={styles.moreSettingsColumn}>
            <Text.M>{actions.moreSettingsLabel}</Text.M>
            {actions.onUpdateNftsPress && (
              <IconButton.Static
                label={{
                  position: 'right',
                  content: String(actions.updateNftsLabel),
                }}
                icon={<Icon name="ImageAdd" />}
                testID="edit-nft-folder-update-nfts-btn"
                onPress={actions.onUpdateNftsPress}
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
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: footerHeight.horizontal,
  },
  editFolderContentContainer: {
    marginHorizontal: spacing.S,
  },
  nameColumn: {
    marginTop: spacing.M,
    gap: spacing.S,
  },
  moreSettingsColumn: {
    marginTop: spacing.S,
    paddingBottom: footerHeight.horizontal,
  },
});
