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
  SheetFooter,
  SheetHeader,
  RadioGroup,
  DropdownMenu,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

import type { Theme } from '../../../../design-tokens';
import type { IconName } from '../../../atoms';
import type { ButtonConfig } from '../../../molecules/sheetFooter/sheetFooter.types';
import type { BlockchainName } from '@lace-lib/util-store';

interface DropdownItem {
  id: string;
  text: string;
  value: number;
  disabled?: boolean;
}

interface AddAccountSheetProps {
  title: string;
  description: string;
  walletLabel: string;
  accountNameInputLabel: string;
  accountName: string;
  accountNameError?: string;
  onAccountNameChange: (text: string) => void;
  selectedBlockchain: string;
  onBlockchainChange: (value: string) => void;
  blockchainOptions: BlockchainName[];
  secondaryButton: ButtonConfig;
  primaryButton?: ButtonConfig;
  testID?: string;
  accountNameInputTestID?: string;
  accountIndexInputLabel?: string;
  accountIndexInputTestID?: string;
  onAccountIndexChange?: (value: number) => void;
  accountIndex?: number;
  accountIndexDropdownItems?: DropdownItem[];
  hasAvailableIndices?: boolean;
  allIndicesUsedMessage?: string;
}

export const AddAccountSheet = ({
  title,
  description,
  walletLabel,
  accountNameInputLabel,
  accountName,
  accountNameError,
  onAccountNameChange,
  selectedBlockchain,
  onBlockchainChange,
  blockchainOptions,
  secondaryButton,
  primaryButton,
  testID = 'add-account-sheet',
  accountNameInputTestID = 'add-account-sheet-name-input',
  accountIndexInputTestID = 'add-account-sheet-index-input',
  accountIndexInputLabel,
  onAccountIndexChange,
  accountIndex,
  accountIndexDropdownItems = [],
  hasAvailableIndices = true,
  allIndicesUsedMessage = '',
}: AddAccountSheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(theme, footerHeight),
    [theme, footerHeight],
  );

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
    <>
      <SheetHeader title={title} testID={`${testID}-header`} />
      <Sheet.Scroll
        testID={testID}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}>
        <Column gap={spacing.M} alignItems="flex-start">
          <Row alignItems="center" gap={spacing.S}>
            <Icon
              name="InformationCircle"
              size={16}
              testID={`${testID}-icon`}
            />
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
            isWithinBottomSheet
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
          {!hasAvailableIndices ? (
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
          )}
        </Column>
      </Sheet.Scroll>

      <SheetFooter
        secondaryButton={secondaryButton}
        primaryButton={primaryButton}
      />
    </>
  );
};

const getStyles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      gap: spacing.L,
      paddingBottom: footerHeight,
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
