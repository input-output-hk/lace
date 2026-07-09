import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import {
  Avatar,
  Button,
  Column,
  CustomTextInput,
  Divider,
  Row,
  Text,
} from '../../../atoms';
import { DropdownMenu } from '../../../molecules';
import { Sheet, footerHeight } from '../../../organisms';

import type {
  ContactSheetProps,
  Recipient,
  BlockchainOption,
} from './contactSheet.types';

interface RecipientItemProps {
  recipient: Recipient;
  index: number;
  totalRecipients: number;
  blockchainOptions: BlockchainOption[];
  onBlockchainChange: (id: string, index: number) => void;
  onAddressChange: (
    id: string,
    address: string,
    blockchainType?: string,
  ) => void;
  onAddressBlur?: (id: string) => void;
  onRemoveRecipient: (id: string) => void;
  testIDPrefix?: string;
}

const RecipientItem = ({
  recipient,
  index,
  totalRecipients,
  blockchainOptions,
  onBlockchainChange,
  onAddressChange,
  onAddressBlur,
  onRemoveRecipient,
  testIDPrefix,
}: RecipientItemProps) => {
  const { t } = useTranslation();

  return (
    <>
      {index > 0 && <Divider />}
      <Column style={styles.recipientSection}>
        <DropdownMenu
          items={blockchainOptions}
          title={recipient.blockchain}
          selectedItemId={recipient.id}
          onSelectItem={itemIndex => {
            onBlockchainChange(recipient.id, itemIndex);
          }}
          titleLeftIcon={recipient.blockchainIcon}
          testID={
            testIDPrefix
              ? `${testIDPrefix}-blockchain-dropdown-${index}`
              : undefined
          }
        />
        <CustomTextInput
          label={t('v2.contact-sheet.label.address')}
          value={recipient.address}
          onChangeText={text => {
            onAddressChange(recipient.id, text, recipient.blockchainType);
          }}
          onBlur={() => {
            onAddressBlur?.(recipient.id);
          }}
          size="large"
          multiline
          inputError={recipient.error}
          testID={
            testIDPrefix ? `${testIDPrefix}-address-input-${index}` : undefined
          }
        />
        {totalRecipients > 1 && (
          <Row justifyContent="space-between" alignItems="center">
            <Text.S variant="secondary">
              {t('v2.contact-sheet.button.remove-address')}
            </Text.S>
            <Button.Critical
              onPress={() => {
                onRemoveRecipient(recipient.id);
              }}
              preIconName="Delete"
              size="small"
              testID={
                testIDPrefix
                  ? `${testIDPrefix}-remove-recipient-${index}`
                  : undefined
              }
            />
          </Row>
        )}
      </Column>
    </>
  );
};

export const ContactSheet = ({
  mode,
  name,
  onNameChange,
  recipients,
  onAddRecipient,
  onRemoveRecipient,
  onBlockchainChange,
  onAddressChange,
  onAddressBlur,
  blockchainOptions,
  avatarFallback,
  avatarUrl,
  isResolvingAlias,
  onUploadAvatar,
  onRemoveContact,
  nameError,
  testID,
}: ContactSheetProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Auto-detect is always the first option provided by the template
  const autoDetectOption = {
    id: 'auto-detect',
    type: 'auto-detect',
    text: t('v2.contact-sheet.blockchain.auto-detect'),
    leftIcon: 'TextColor' as const,
  };

  // Merge auto-detect with provided blockchain options
  const allBlockchainOptions = [autoDetectOption, ...blockchainOptions];

  const handleBlockchainChange = (id: string, index: number) => {
    const blockchainType = allBlockchainOptions[index].type;
    onBlockchainChange(id, blockchainType);
  };

  return (
    <Sheet.Scroll>
      <Column alignItems="center" gap={spacing.M} style={styles.container}>
        <View style={styles.avatarContainer}>
          <Avatar
            size={100}
            content={{
              img: avatarUrl ? { uri: avatarUrl } : undefined,
              fallback: avatarFallback,
            }}
            shape="rounded"
          />
          {isResolvingAlias && (
            <View style={styles.avatarLoadingOverlay}>
              <ActivityIndicator size="small" color={theme.text.primary} />
            </View>
          )}
        </View>

        {onUploadAvatar && (
          <Button.Secondary
            label={t('v2.contact-sheet.button.upload')}
            onPress={onUploadAvatar}
            preIconName="ImageAdd"
          />
        )}

        {mode === 'edit' && onRemoveContact && (
          <View style={styles.removeButtonContainer}>
            <Button.Critical
              testID={testID ? `${testID}-remove-contact-button` : undefined}
              label={t('v2.contact-sheet.button.remove')}
              onPress={onRemoveContact}
              fullWidth
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <CustomTextInput
            label={t('v2.contact-sheet.label.name')}
            value={name}
            onChangeText={onNameChange}
            inputError={nameError}
            testID={testID ? `${testID}-name-input` : undefined}
          />
        </View>

        <Row
          style={styles.recipientsHeader}
          justifyContent="space-between"
          alignItems="center">
          <Text.S variant="primary">
            {t('v2.contact-sheet.label.recipients')}
          </Text.S>
          <Button.Secondary
            onPress={() => {
              onAddRecipient();
            }}
            preIconName="Plus"
            size="small"
            testID={testID ? `${testID}-add-recipient-button` : undefined}
          />
        </Row>

        {recipients.map((recipient, index) => (
          <RecipientItem
            key={recipient.id}
            recipient={recipient}
            index={index}
            totalRecipients={recipients.length}
            blockchainOptions={allBlockchainOptions}
            onBlockchainChange={handleBlockchainChange}
            onAddressChange={onAddressChange}
            onAddressBlur={onAddressBlur}
            onRemoveRecipient={onRemoveRecipient}
            testIDPrefix={testID}
          />
        ))}

        <Text.XS variant="secondary" style={styles.addressCount}>
          {t('v2.contact-sheet.info.addresses-included', {
            count: recipients.length,
          })}
        </Text.XS>
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: footerHeight.horizontal,
  },
  avatarContainer: {
    marginVertical: spacing.S,
    position: 'relative',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
  },
  removeButtonContainer: {
    width: '100%',
    marginTop: spacing.XL,
    marginBottom: spacing.M,
  },
  inputContainer: {
    width: '100%',
  },
  recipientsHeader: {
    width: '100%',
    marginTop: spacing.L,
  },
  recipientSection: {
    width: '100%',
    gap: spacing.M,
    marginTop: spacing.M,
  },
  addressCount: {
    marginTop: spacing.M,
  },
});
