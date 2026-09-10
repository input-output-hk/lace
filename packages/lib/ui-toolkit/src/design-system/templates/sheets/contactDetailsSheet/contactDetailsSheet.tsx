import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme, type Theme } from '../../../../design-tokens';
import {
  Avatar,
  Beacon,
  Button,
  Column,
  Divider,
  Icon,
  IconButton,
  Row,
  Text,
} from '../../../atoms';
import { footerHeight, Sheet } from '../../../organisms';

import type { AvatarContent } from '../../../../utils/avatarUtils';
import type { IconName } from '../../../atoms';

const BLOCKCHAIN_ICON_SIZE = 20;
const CONTACT_AVATAR_SIZE = 100;

interface ActionButtonsProps {
  onDeletePress: () => void;
  onEditPress: () => void;
  onCopyPress: (address: string) => void;
  /** Optional quick action rendered under the name (e.g. send to contact). */
  onSendPress?: () => void;
}

interface LabelsProps {
  name: string;
  /** Label for the optional send quick action. */
  sendLabel?: string;
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
  const { name, sendLabel } = labels;
  const { onCopyPress, onSendPress } = actions;
  const { theme } = useTheme();
  const isDarkMode = theme.name === 'dark';

  return (
    <Sheet.Scroll
      testID="contact-details-sheet-body"
      contentContainerStyle={styles.scrollContent}>
      <Column alignItems="center" gap={spacing.M} style={styles.content}>
        <Avatar content={avatar} size={CONTACT_AVATAR_SIZE} shape="rounded" />
        <Text.L testID="contact-details-sheet-name">{name}</Text.L>
        {onSendPress && sendLabel ? (
          <Button.Secondary
            label={sendLabel}
            preIconName="ArrowUp"
            size="small"
            onPress={onSendPress}
            testID="contact-details-sheet-send-button"
          />
        ) : undefined}
      </Column>
      {/* Plain rows (a contact holds a handful of addresses): keeps intrinsic
          height so auto-sized sheets can measure the content — a virtualized
          list needs a bounded parent and collapses under 'auto' detents. */}
      <Column gap={spacing.S}>
        {contact.addresses.map((item, index) => (
          <React.Fragment key={`${item.address}-${index}`}>
            {renderAddressItem({
              isDarkMode,
              item,
              onCopy: onCopyPress,
              theme,
            })}
          </React.Fragment>
        ))}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  // Keeps the last address row above the sheet footer (same fix as
  // fiatCurrencySheet).
  scrollContent: {
    paddingBottom: footerHeight.horizontal,
  },
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
