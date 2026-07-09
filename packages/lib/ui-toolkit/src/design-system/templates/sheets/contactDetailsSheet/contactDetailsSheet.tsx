import React, { useCallback } from 'react';
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
  name: string;
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

      <Row gap={spacing.XL} justifyContent="space-between" alignItems="center">
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
  const { name } = labels;
  const { onCopyPress } = actions;
  const { theme } = useTheme();
  const isDarkMode = theme.name === 'dark';

  const renderItem = useCallback(
    ({ item }: { item: ContactAddress }) =>
      renderAddressItem({ item, onCopy: onCopyPress, theme, isDarkMode }),
    [onCopyPress, theme, isDarkMode],
  );

  const keyExtractor = (item: ContactAddress, index: number) =>
    `${item.address}-${index}`;

  return (
    <Sheet.Scroll testID="contact-details-sheet-body">
      <Column alignItems="center" gap={spacing.M} style={styles.content}>
        <Avatar content={avatar} size={CONTACT_AVATAR_SIZE} shape="rounded" />
        <Text.L testID="contact-details-sheet-name">{name}</Text.L>
      </Column>
      <GenericFlashList<ContactAddress>
        data={contact.addresses}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.contentContainer}
      />
    </Sheet.Scroll>
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
  contentContainer: {
    gap: spacing.S,
  },
});
