import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme, type Theme } from '../../../../design-tokens';
import {
  Avatar,
  Beacon,
  Column,
  Divider,
  Icon,
  IconButton,
  Row,
  Text,
} from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { GenericFlashList, Sheet } from '../../../organisms';

import type { AvatarContent } from '../../../../utils/avatarUtils';
import type { IconName } from '../../../atoms';

const BLOCKCHAIN_ICON_SIZE = 20;
const CONTACT_AVATAR_SIZE = 100;

interface ActionButtonsProps {
  onDeletePress: () => void;
  onEditPress: () => void;
  onCopyPress: (address: string) => void;
}

interface LabelsProps {
  headerTitle: string;
  name: string;
  deleteButtonLabel: string;
  editButtonLabel: string;
}

type ContactAddress = {
  blockchainName: IconName;
  address: string;
};

interface ContactDetailsSheetTemplateProps {
  actions: ActionButtonsProps;
  labels: LabelsProps;
  avatar: AvatarContent;
  contact: {
    addresses: ContactAddress[];
  };
}

interface AddressItemProps {
  item: ContactAddress;
  onCopy: (address: string) => void;
  theme: Theme;
  isDarkMode: boolean;
}

const renderAddressItem = ({
  item,
  onCopy,
  theme,
  isDarkMode,
}: AddressItemProps) => {
  return (
    <Column gap={spacing.M}>
      <Column style={styles.dividerWrapper}>
        <Divider />
      </Column>

      <Row gap={spacing.M} justifyContent="space-between" alignItems="center">
        <Row alignItems="center" gap={spacing.S} style={styles.address}>
          <Beacon
            icon={
              <Icon
                name={item.blockchainName}
                size={BLOCKCHAIN_ICON_SIZE}
                color={theme.background.primary}
              />
            }
            color={isDarkMode ? 'black' : 'white'}
          />
          <Text.XS
            numberOfLines={3}
            testID={`contact-details-sheet-address-${item.blockchainName}`}>
            {item.address}
          </Text.XS>
        </Row>
        <IconButton.Static
          testID={`contact-item-copy-button-${item.blockchainName}`}
          icon={<Icon name="Copy" size={16} />}
          onPress={() => {
            onCopy(item.address);
          }}
        />
      </Row>
    </Column>
  );
};

export const ContactDetailsSheetTemplate = ({
  actions,
  labels,
  avatar,
  contact,
}: ContactDetailsSheetTemplateProps) => {
  const { headerTitle, name, deleteButtonLabel, editButtonLabel } = labels;
  const { onDeletePress, onEditPress, onCopyPress } = actions;
  const { theme } = useTheme();
  const isDarkMode = theme.name === 'dark';
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  const renderItem = useCallback(
    ({ item }: { item: ContactAddress }) =>
      renderAddressItem({ item, onCopy: onCopyPress, theme, isDarkMode }),
    [onCopyPress, theme, isDarkMode],
  );

  const keyExtractor = (item: ContactAddress, index: number) =>
    `${item.address}-${index}`;

  return (
    <>
      <SheetHeader title={headerTitle} testID="contact-details-sheet-header" />
      <Sheet.Scroll
        testID="contact-details-sheet-body"
        contentContainerStyle={scrollContainerStyle}>
        <Column alignItems="center" gap={spacing.M} style={styles.content}>
          <Avatar content={avatar} size={CONTACT_AVATAR_SIZE} shape="rounded" />
          <Text.L testID="contact-details-sheet-name">{name}</Text.L>
        </Column>
        <GenericFlashList<ContactAddress>
          data={contact.addresses}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={scrollContainerStyle}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />
      </Sheet.Scroll>
      <SheetFooter
        testID="contact-details-sheet-footer"
        secondaryButton={{
          label: deleteButtonLabel,
          onPress: onDeletePress,
          testID: 'contact-details-sheet-delete-button',
        }}
        primaryButton={{
          label: editButtonLabel,
          onPress: onEditPress,
          testID: 'contact-details-sheet-edit-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    marginBottom: spacing.M,
  },
  address: {
    flex: 1,
  },
  dividerWrapper: {
    marginTop: spacing.M,
  },
});
