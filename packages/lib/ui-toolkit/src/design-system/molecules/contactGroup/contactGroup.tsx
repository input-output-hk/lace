import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import {
  Text,
  Avatar,
  BlurView,
  Icon,
  Row,
  Column,
  Divider,
} from '../../atoms';

import type { Theme } from '../../../design-tokens/theme/types';
import type { IconName } from '../../atoms';
import type { ContactItemProps } from '../contactItem/contact';

export type ContactGroupProps = {
  asset: ContactItemProps & { contacts: ContactItemProps[] };
  label?: string;
  onPressItemCopy?: (contact: ContactItemProps) => void;
  onPressItemShare?: (contact: ContactItemProps) => void;
};

export const ContactGroup: React.FC<ContactGroupProps> = ({ asset, label }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = getStyles(theme);
  const contacts = asset.contacts || [];

  const chainIconSize: number = 12;
  const iconSize: number = 24;
  // Collect unique chain icons from contacts
  const uniqueChains = Array.from(
    new Set(
      contacts.flatMap((c: ContactItemProps) =>
        c.addresses.map(addr => addr.blockchainName),
      ),
    ),
  );
  const fallbackContact: string = useMemo(
    () =>
      asset.name
        ? asset.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '',
    [asset.name],
  );

  const labelCount = useMemo(
    () =>
      `${contacts.reduce(
        (total, contact) => total + contact.addresses.length,
        0,
      )} ${String(t('v2.generic.btn.addresses'))}`,
    [contacts, t],
  );

  const handleContactGroupPress = useCallback(() => {
    if (contacts.length >= 1) {
      setIsExpanded(previous => !previous);
    } else {
      return undefined;
    }
  }, [contacts.length]);

  return (
    <BlurView style={styles.card}>
      {/* Header Row */}
      <TouchableOpacity
        style={styles.pressableCard}
        onPress={handleContactGroupPress}
        activeOpacity={contacts.length > 1 ? 0.8 : 1}>
        {/* Avatar */}
        <Row alignItems="center" gap={spacing.S}>
          <Avatar
            size={40}
            shape="squared"
            content={{
              img: asset.avatarImage,
              fallback: fallbackContact,
            }}
          />
          {/* Name, Coin Icons, Address Count */}
          <Column>
            <Text.XS>{asset.name}</Text.XS>
            <Row alignItems="center" gap={spacing.XS}>
              {uniqueChains.map((chain, index) => (
                <Row
                  key={`${chain}-${index}`}
                  alignItems="center"
                  justifyContent="center">
                  <Icon
                    name={chain as IconName}
                    width={chainIconSize}
                    height={chainIconSize}
                  />
                </Row>
              ))}
              <Text.XS variant="secondary">{label ?? labelCount}</Text.XS>
            </Row>
          </Column>
        </Row>

        {contacts.length > 0 &&
          (isExpanded ? <Icon name="CaretUp" /> : <Icon name="CaretDown" />)}
      </TouchableOpacity>
      {isExpanded && contacts.length > 0 && (
        <Column>
          {contacts.map((contact: ContactItemProps, contactIndex: number) =>
            contact.addresses.map((address, addressIndex: number) => (
              <Column key={`${contact.name}-${contactIndex}-${addressIndex}`}>
                <View style={styles.dividerWrapper}>
                  <Divider />
                </View>

                <Row alignItems="center" justifyContent="space-between">
                  <Row alignItems="center" gap={spacing.S}>
                    {/* Coin icon as avatar */}
                    <Icon
                      name={address.blockchainName as IconName}
                      width={iconSize}
                      height={iconSize}
                    />

                    <Column>
                      <Text.XS>{address.blockchainName}</Text.XS>
                      <Text.XS
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        variant="secondary">
                        {address.address}
                      </Text.XS>
                    </Column>
                  </Row>
                  <Row alignItems="center" gap={spacing.S}>
                    {contact.quickActions?.onCopyPress && (
                      <Pressable
                        onPress={contact.quickActions.onCopyPress}
                        style={styles.actionButton}
                        hitSlop={8}>
                        <Icon name="Copy" size={16} />
                      </Pressable>
                    )}
                    {contact.quickActions?.onSharePress && (
                      <Pressable
                        onPress={contact.quickActions.onSharePress}
                        style={styles.actionButton}
                        hitSlop={8}>
                        <Icon name="Share" size={14} />
                      </Pressable>
                    )}
                  </Row>
                </Row>
              </Column>
            )),
          )}
        </Column>
      )}
    </BlurView>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.M,
      backgroundColor: theme.background.page,
      padding: spacing.M,
      marginVertical: spacing.S,
      shadowColor: 'rgba(0,0,0,0.03)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    pressableCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contactAvatar: {
      width: 28,
      height: 28,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: radius.M,
      backgroundColor: theme.background.page,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      shadowColor: 'rgba(0,0,0,0.04)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: theme.border.top,
    },
    dividerWrapper: {
      marginVertical: spacing.S,
    },
  });
