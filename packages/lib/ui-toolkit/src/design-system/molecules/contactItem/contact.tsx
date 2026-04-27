import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  Avatar,
  BlurView,
  Text,
  IconButton,
  Icon,
  Row,
  Column,
  Divider,
} from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { BlockchainIconName, IconName } from '../../atoms';
import type { AnyAddress } from '../../util/types';

export type ContactItemProps = {
  name: string;
  addresses: AnyAddress[];
  avatarImage?: { uri: string };
  quickActions?: {
    onCopyPress?: () => void;
    onSharePress?: () => void;
    onSelectAddress?: (address: string) => void;
    onContactPress?: () => void;
  };
  chainIcons?: IconName[];
  testID?: string;
};

const avatarSize = 38;

export const Contact: React.FC<ContactItemProps> = ({
  name,
  addresses,
  chainIcons,
  avatarImage,
  quickActions,
  testID,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  const addressCount = addresses.length;

  const handleToggle = () => {
    setIsExpanded(previous => !previous);
  };

  const handleContactPress = useCallback(() => {
    if (quickActions?.onContactPress) {
      quickActions.onContactPress();
      return;
    }
    if (addresses.length > 1) {
      handleToggle();
    } else {
      quickActions?.onSelectAddress?.(addresses[0].address);
    }
  }, [addresses, quickActions, handleToggle]);

  const copyButton = quickActions?.onCopyPress && (
    <IconButton.Static
      icon={<Icon name="Copy" size={16} />}
      onPress={quickActions.onCopyPress}
      containerStyle={styles.iconButton}
    />
  );

  const shareButton = quickActions?.onSharePress && (
    <IconButton.Static
      icon={<Icon name="Share" size={14} />}
      onPress={quickActions.onSharePress}
      containerStyle={styles.iconButton}
    />
  );

  const renderAddressesPreview = useCallback(() => {
    const iconsToShow = chainIcons?.slice(0, 3) ?? [];

    return (
      <Row alignItems="center" gap={spacing.XS}>
        {iconsToShow.map(icon => (
          <Icon key={icon} name={icon} size={16} />
        ))}
        <Text.XS variant="secondary">
          {`${addressCount} ${
            addressCount > 1
              ? String(t('v2.contact-card.addresseses'))
              : String(t('v2.contact-card.addresses'))
          }`}
        </Text.XS>
      </Row>
    );
  }, [chainIcons, addressCount, t]);

  const renderExpandedAddresses = useCallback(() => {
    return (
      <Column gap={spacing.XS} style={styles.expandedContainer}>
        {addresses.map((contactAddress, index) => (
          <TouchableOpacity
            style={styles.expandedAddressItem}
            key={index}
            testID={testID ? `${testID}-address-${index}` : undefined}
            onPress={() => {
              quickActions?.onSelectAddress?.(contactAddress.address);
            }}>
            <Divider />
            <Column gap={spacing.XS}>
              <Row alignItems="center" gap={spacing.XS}>
                <Icon
                  name={contactAddress.blockchainName as BlockchainIconName}
                  size={16}
                />
                <Text.XS>{contactAddress.blockchainName}</Text.XS>
              </Row>
              <Text.XS
                numberOfLines={1}
                ellipsizeMode="middle"
                variant="secondary">
                {contactAddress.address}
              </Text.XS>
            </Column>
          </TouchableOpacity>
        ))}
      </Column>
    );
  }, [addresses, quickActions, styles, testID]);

  return (
    <BlurView style={styles.container}>
      <TouchableOpacity
        style={styles.mainContent}
        onPress={handleContactPress}
        activeOpacity={addresses.length > 1 ? 0.7 : 1}
        testID={testID}>
        <Avatar
          shape="squared"
          size={avatarSize}
          content={{
            img: avatarImage,
            fallback: name,
          }}
          style={styles.avatar}
        />
        <Column style={styles.info}>
          <Row alignItems="center" justifyContent="space-between">
            <Row alignItems="center">
              {addresses.length === 1 && chainIcons?.[0] && (
                <View style={styles.chainIcon}>
                  <Icon name={chainIcons[0]} size={16} />
                </View>
              )}
              <Text.XS>{name}</Text.XS>
            </Row>
          </Row>
          {addresses.length > 1 ? (
            renderAddressesPreview()
          ) : addresses.length === 1 ? (
            <Text.XS
              numberOfLines={1}
              ellipsizeMode="middle"
              variant="secondary">
              {addresses[0].address}
            </Text.XS>
          ) : null}
        </Column>
        {copyButton}
        {shareButton}
        {addresses.length > 1 && !quickActions?.onContactPress && (
          <Icon
            name={isExpanded ? 'CaretUp' : 'CaretDown'}
            size={16}
            color={theme.text.secondary}
          />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.expandedContainer}>
          {renderExpandedAddresses()}
        </View>
      )}
    </BlurView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderRadius: radius.M,
      padding: spacing.M,
      marginVertical: spacing.S,
      minHeight: 80,
      overflow: 'hidden',
      backgroundColor: theme.background.primary,
    },
    mainContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: spacing.S,
    },
    info: {
      flex: 1,
      gap: spacing.XS,
    },
    chainIcon: {
      marginRight: spacing.XS,
    },
    expandedContainer: {
      marginTop: spacing.S,
    },
    expandedAddressItem: {
      paddingVertical: spacing.XS,
      gap: spacing.S,
    },
    iconButton: {
      backgroundColor: theme.background.primary,
      marginLeft: spacing.S,
    },
  });
