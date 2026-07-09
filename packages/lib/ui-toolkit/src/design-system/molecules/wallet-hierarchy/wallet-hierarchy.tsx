import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Pressable, FlatList } from 'react-native';

import {
  useTheme,
  spacing,
  radius,
  getShadowStyle,
} from '../../../design-tokens';
import {
  Avatar,
  Button,
  Card,
  Column,
  Text,
  Row,
  Beacon,
  Icon,
  Divider,
  SecurityAlertPill,
} from '../../atoms';
import { getIsDark } from '../../util';

import type { Theme } from '../../../design-tokens';

export interface WalletHierarchyItem {
  id: string;
  image?: string;
  title: string;
  /** Optional trailing label rendered as a `SecurityAlertPill` next to the
   *  account title — e.g. "At risk". Pass the raw label; the pill's own
   *  visual encapsulation makes bracket wrapping unnecessary. */
  suffix?: string;
  subtitle: string;
  icon: React.ReactNode;
}

export interface WalletHierarchyProps {
  headerIcon?: React.ReactNode;
  title: string;
  showAlert?: boolean;
  showTag?: boolean;
  showActionButton?: boolean;
  showAddButton?: boolean;
  showHeader?: boolean;
  actionButtonLabel: string;
  addButtonLabel: string;
  items: WalletHierarchyItem[];
  onActionButtonPress?: () => void;
  onAddButtonPress?: () => void;
  onItemPress?: (accountId: string) => void;
  onItemSuffixPress?: (accountId: string) => void;
}

interface WalletHeaderProps {
  headerIcon?: React.ReactNode;
  title: string;
  showAlert?: boolean;
  showTag?: boolean;
  showActionButton?: boolean;
  actionButtonLabel: string;
  onActionButtonPress?: () => void;
  styles: ReturnType<typeof getStyles>;
}

interface WalletItemProps {
  item: WalletHierarchyItem;
  onItemPress?: (accountId: string) => void;
  onItemSuffixPress?: (accountId: string) => void;
  styles: ReturnType<typeof getStyles>;
  theme: Theme;
}

interface WalletAddButtonProps {
  addButtonLabel: string;
  onAddButtonPress: () => void;
  styles: ReturnType<typeof getStyles>;
}

const WalletHeader: React.FC<WalletHeaderProps> = ({
  headerIcon,
  title,
  showAlert = true,
  showTag = true,
  showActionButton = true,
  actionButtonLabel,
  onActionButtonPress,
  styles,
}) => {
  const { theme } = useTheme();
  const iconColor = theme.data.negative;
  return (
    <>
      <Row
        alignItems="center"
        justifyContent="space-between"
        style={styles.walletHeader}
        gap={spacing.M}>
        <Row alignItems="center" style={styles.walletHeaderLeft}>
          {showTag && (
            <Row
              justifyContent="space-between"
              alignItems="center"
              gap={spacing.L}>
              <Row
                gap={spacing.S}
                alignItems="center"
                justifyContent="space-between"
                style={styles.walletHeaderTitle}>
                {headerIcon}
                <Text.M numberOfLines={2} testID="wallet-card-title">
                  {title}
                </Text.M>
              </Row>
              {showAlert && (
                <View style={styles.walletHeaderAlert}>
                  <Beacon
                    size={23}
                    color="negative"
                    backgroundType="semiTransparent"
                    icon={
                      <Icon
                        name="AlertTriangle"
                        size={15}
                        color={iconColor}
                        testID="wallet-card-alert"
                      />
                    }
                  />
                </View>
              )}
            </Row>
          )}
        </Row>
        {showActionButton && onActionButtonPress && (
          <View style={styles.actionButtonContainer}>
            <Button.Tertiary
              size="small"
              testID="wallet-hierarchy-action-button"
              label={actionButtonLabel}
              preIconName="Settings"
              iconSize={18}
              onPress={onActionButtonPress}
            />
          </View>
        )}
      </Row>
      <Divider />
    </>
  );
};

const WalletItem: React.FC<WalletItemProps> = ({
  item,
  onItemPress,
  onItemSuffixPress,
  styles,
  theme,
}) => {
  return (
    <Column testID={`wallet-hierarchy-item-${item.id}`}>
      <Pressable
        style={({ pressed }) => [
          styles.itemRow,
          pressed && styles.pressedStyle,
        ]}
        onPress={() => {
          onItemPress?.(item.id);
        }}>
        <Row alignItems="center" style={styles.itemLeft}>
          <Avatar
            style={styles.itemIcon}
            size={spacing.XL}
            shape="rounded"
            content={{
              img: item.image ? { uri: item.image } : { uri: '' },
              fallback: item.title,
            }}
          />
          <View style={styles.itemInfo}>
            <Row alignItems="center" style={styles.accountNameRow}>
              <Text.M testID="account-name">{item.title}</Text.M>
              {item.suffix ? (
                <SecurityAlertPill
                  label={item.suffix}
                  testID="account-name-suffix"
                  onPress={
                    onItemSuffixPress
                      ? () => {
                          onItemSuffixPress(item.id);
                        }
                      : undefined
                  }
                />
              ) : null}
            </Row>
            <Row style={styles.itemSubtitleRow}>
              <Beacon backgroundType="semiTransparent" icon={item.icon} />
              <Text.S
                variant="secondary"
                style={styles.itemSubtitleText}
                testID="blockchain-name">
                {item.subtitle}
              </Text.S>
            </Row>
          </View>
        </Row>
        <View style={styles.itemArrow}>
          <Icon name="CaretRight" size={15} color={theme.text.secondary} />
        </View>
      </Pressable>
      <Divider />
    </Column>
  );
};

const WalletAddButton: React.FC<WalletAddButtonProps> = ({
  addButtonLabel,
  onAddButtonPress,
  styles,
}) => {
  return (
    <View style={styles.addButton}>
      <Button.Tertiary
        preNode={<Icon name="Plus" size={18} />}
        label={addButtonLabel}
        onPress={onAddButtonPress}
        testID="wallet-hierarchy-add-account-button"
        fullWidth
      />
    </View>
  );
};

export const WalletHierarchy: React.FC<WalletHierarchyProps> = ({
  headerIcon,
  title,
  showAlert = true,
  showTag = true,
  showActionButton = true,
  showAddButton = true,
  showHeader = true,
  actionButtonLabel,
  addButtonLabel,
  items,
  onActionButtonPress,
  onAddButtonPress,
  onItemPress,
  onItemSuffixPress,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const renderItem = useCallback(
    ({ item }: { item: WalletHierarchyItem }) => (
      <WalletItem
        item={item}
        onItemPress={onItemPress}
        onItemSuffixPress={onItemSuffixPress}
        styles={styles}
        theme={theme}
      />
    ),
    [onItemPress, onItemSuffixPress, styles, theme],
  );

  const keyExtractor = useCallback((item: WalletHierarchyItem) => item.id, []);

  return (
    <Card cardStyle={styles.walletCard} testID="wallet-hierarchy-card">
      {showHeader && (
        <WalletHeader
          headerIcon={headerIcon}
          title={title}
          showAlert={showAlert}
          showTag={showTag}
          showActionButton={showActionButton}
          actionButtonLabel={actionButtonLabel}
          onActionButtonPress={onActionButtonPress}
          styles={styles}
        />
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      {showAddButton && onAddButtonPress && (
        <WalletAddButton
          addButtonLabel={addButtonLabel}
          onAddButtonPress={onAddButtonPress}
          styles={styles}
        />
      )}
    </Card>
  );
};

const getStyles = (theme: Theme) => {
  const isDark = getIsDark(theme);
  const backgroundColor = isDark ? theme.brand.black : theme.brand.white;
  return StyleSheet.create({
    walletCard: {
      borderRadius: radius.M,
      gap: 0,
      backgroundColor,
      borderWidth: 0.5,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      borderLeftColor: theme.border.middle,
      borderRightColor: theme.border.middle,
      overflow: 'visible',
      ...getShadowStyle({ theme, variant: 'card' }),
    },
    walletHeader: {
      marginBottom: spacing.M,
    },
    walletHeaderLeft: {
      flexShrink: 1,
    },
    walletHeaderTitle: {
      flexShrink: 1,
    },
    actionButtonContainer: {
      flexShrink: 0,
    },
    addButton: {
      marginTop: spacing.M,
    },
    itemRow: {
      marginVertical: spacing.M,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemLeft: {
      flex: 1,
    },
    itemIcon: {
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.M,
    },
    itemInfo: {
      flex: 1,
    },
    accountNameRow: {
      gap: spacing.XS,
      flexWrap: 'wrap',
    },
    itemSubtitleRow: {
      marginTop: spacing.XS,
      alignItems: 'center',
    },
    itemSubtitleText: {
      marginLeft: spacing.XS,
    },
    itemArrow: {
      padding: spacing.S,
    },
    pressedStyle: {
      opacity: 0.7,
    },
    walletHeaderAlert: {
      marginLeft: spacing.XS,
    },
  });
};
