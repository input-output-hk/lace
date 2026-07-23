import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import {
  Text,
  CustomTextInput,
  Icon,
  CustomTag,
  Divider,
  Column,
  Row,
} from '../../../atoms';
import {
  RadioGroup,
  DropdownMenu,
  DropdownMenuViewport,
} from '../../../molecules';
import { footerHeight } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

import type { Theme } from '../../../../design-tokens';
import type { IconName } from '../../../atoms';
import type { BlockchainName } from '@lace-lib/util-store';

interface DropdownItem {
  id: string;
  text: string;
  value: number;
  disabled?: boolean;
}

interface AddAccountSheetProps {
  description: string;
  walletLabel: string;
  accountNameInputLabel: string;
  accountName: string;
  accountNameError?: string;
  onAccountNameChange: (text: string) => void;
  selectedBlockchain: string;
  onBlockchainChange: (value: string) => void;
  blockchainOptions: BlockchainName[];
  testID?: string;
  accountNameInputTestID?: string;
  accountIndexInputLabel?: string;
  accountIndexInputTestID?: string;
  onAccountIndexChange?: (value: number) => void;
  accountIndex?: number;
  accountIndexDropdownItems?: DropdownItem[];
  hasAvailableIndices?: boolean;
  showAccountIndexSelection?: boolean;
  allIndicesUsedMessage?: string;
}

export const AddAccountSheet = ({
  description,
  walletLabel,
  accountNameInputLabel,
  accountName,
  accountNameError,
  onAccountNameChange,
  selectedBlockchain,
  onBlockchainChange,
  blockchainOptions,
  testID = 'add-account-sheet',
  accountNameInputTestID = 'add-account-sheet-name-input',
  accountIndexInputTestID = 'add-account-sheet-index-input',
  accountIndexInputLabel,
  onAccountIndexChange,
  accountIndex,
  accountIndexDropdownItems = [],
  hasAvailableIndices = true,
  showAccountIndexSelection = true,
  allIndicesUsedMessage = '',
}: AddAccountSheetProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const handleAccountIndexSelect = useCallback(
    (index: number) => {
      const selectedItem = accountIndexDropdownItems[index];
      if (selectedItem && !selectedItem.disabled) {
        onAccountIndexChange?.(selectedItem.value);
      }
    },
    [accountIndexDropdownItems, onAccountIndexChange],
  );

  const selectedAccountId = useMemo(() => {
    if (!accountIndex) return undefined;
    const item = accountIndexDropdownItems.find(
      item => item.value === accountIndex,
    );
    return item?.id;
  }, [accountIndex, accountIndexDropdownItems]);

  return (
    <DropdownMenuViewport
      testID={testID}
      style={styles.contentContainer}
      boundaryInsets={{ top: spacing.M, bottom: footerHeight.horizontal }}>
      <Column gap={spacing.M} alignItems="flex-start">
        <Row alignItems="center" gap={spacing.S}>
          <Icon name="InformationCircle" size={16} testID={`${testID}-icon`} />
          <Text.XS testID={`${testID}-description`}>{description}</Text.XS>
        </Row>
        <CustomTag
          size="S"
          icon={<Icon name="Wallet" size={16} />}
          label={walletLabel}
          color="white"
          testID={`${testID}-wallet-tag`}
        />
      </Column>

      <Divider />
      <Column gap={spacing.L}>
        <CustomTextInput
          animatedLabel
          label={accountNameInputLabel}
          testID={accountNameInputTestID}
          onChangeText={onAccountNameChange}
          value={accountName}
          inputError={accountNameError}
          editable={hasAvailableIndices}
          maxLength={NAME_MAX_LENGTH}
        />
        <RadioGroup
          options={blockchainOptions.map(blockchain => ({
            value: blockchain,
            label: blockchain,
            preIcon: blockchain as IconName,
          }))}
          value={selectedBlockchain}
          onChange={onBlockchainChange}
          direction="column"
        />
        {showAccountIndexSelection &&
          (!hasAvailableIndices ? (
            <Row
              alignItems="center"
              gap={spacing.M}
              style={styles.errorMessageContainer}>
              <Icon
                name="InformationCircle"
                size={24}
                testID={`${testID}-error-icon`}
              />
              <Text.M
                style={styles.errorMessageText}
                testID={`${testID}-error-message`}>
                {allIndicesUsedMessage}
              </Text.M>
            </Row>
          ) : (
            <DropdownMenu
              title={accountIndexInputLabel}
              items={accountIndexDropdownItems}
              selectedItemId={selectedAccountId}
              onSelectItem={handleAccountIndexSelect}
              testID={accountIndexInputTestID}
            />
          ))}
      </Column>
    </DropdownMenuViewport>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      padding: spacing.M,
      paddingBottom: footerHeight.horizontal,
      gap: spacing.L,
    },
    errorMessageContainer: {
      padding: spacing.L,
      backgroundColor: theme.background.secondary,
      borderRadius: spacing.S,
    },
    errorMessageText: {
      flex: 1,
    },
  });
