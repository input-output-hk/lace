import type { ListRenderItem } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { shallowEqual } from 'react-redux';

import { useTheme, radius, spacing } from '../../../design-tokens';
import { BlurView, Brand, Button, Pill } from '../../atoms';
import { isAndroid, isWeb } from '../../util';

import { AccountRow, type AccountRowProps } from './accountRow';
import { LaceButton, type LaceButtonBadgeProps } from './laceButton';
import { TabBarMetrics } from './tabBarMetrics';
import { TabButton, type TabButtonProps } from './tabButton';

import type { Theme } from '../../../design-tokens';
import type { Network } from '../../atoms';

interface TabBarProps {
  mainRoutes: TabButtonProps[];
  expandableRoutes: TabButtonProps[];
  accountData: AccountRowProps[];
  networkName: Network;
  laceButtonBadge?: LaceButtonBadgeProps;
  openNetworkSelectionSheet: () => void;
  onLaceButtonPress?: () => void;
  /** Optional hook when user opens the accounts / sync status panel from the tab bar. */
  onAccountsStatusPress?: () => void;
}

export const ExpandableSectionMetrics = {
  headerHeight: 72,
  bottom:
    TabBarMetrics.horizontal.height +
    TabBarMetrics.horizontal.bottom +
    (TabBarMetrics.laceButton.height - TabBarMetrics.horizontal.height) / 2,
  largeItemSize: 100,
  accountRowHeight: 80,
};

const ANIMATION_DURATION = 300;

export const TabBar: React.FC<TabBarProps> = React.memo(
  ({
    mainRoutes,
    expandableRoutes,
    accountData,
    networkName,
    laceButtonBadge,
    openNetworkSelectionSheet,
    onLaceButtonPress,
    onAccountsStatusPress,
  }) => {
    const { theme, layoutSize, isSideMenu } = useTheme();
    const { width, height: windowHeight } = useWindowDimensions();

    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    const [isAccountsStatusOpen, setIsAccountsStatusOpen] =
      useState<boolean>(false);

    const isMenuOpenSV = useSharedValue(false);
    const isAccountsStatusOpenSV = useSharedValue(false);
    const isSideMenuSV = useSharedValue(isSideMenu);

    useEffect(() => {
      isSideMenuSV.value = isSideMenu;
    }, [isSideMenu, isSideMenuSV]);

    const { t } = useTranslation();

    const styles = useMemo(
      () => sharedStyles({ theme, isSideMenu }),
      [theme, isSideMenu],
    );

    const lStyles = useMemo(() => largeStyles({ theme }), [theme]);

    const accountsStatus = useMemo(() => {
      if (accountData.some(account => account.status === 'error'))
        return 'error';
      if (accountData.some(account => account.status === 'syncing'))
        return 'syncing';
      return 'synced';
    }, [accountData]);

    const overallSyncingProgress = useMemo(() => {
      const syncingAccounts = accountData.filter(
        account =>
          account.status === 'syncing' && account.syncingProgress !== undefined,
      );
      if (syncingAccounts.length === 0) return -1;
      const total = syncingAccounts.reduce(
        (sum, account) => sum + (account.syncingProgress ?? 0),
        0,
      );
      return total / syncingAccounts.length;
    }, [accountData]);

    const openMenu = useCallback(() => {
      isMenuOpenSV.value = true;
      setIsMenuOpen(true);
      if (!isWeb) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, [isMenuOpenSV]);

    const closeMenu = useCallback(() => {
      if (!isWeb) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      isMenuOpenSV.value = false;
      isAccountsStatusOpenSV.value = false;
      setIsMenuOpen(false);
      setIsAccountsStatusOpen(false);
    }, [isMenuOpenSV, isAccountsStatusOpenSV]);

    const onLacePress = useCallback(() => {
      onLaceButtonPress?.();
      if (isMenuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }, [isMenuOpen, openMenu, closeMenu, onLaceButtonPress]);

    const openAccountsStatus = useCallback(() => {
      if (isAccountsStatusOpen) return;
      onAccountsStatusPress?.();
      isAccountsStatusOpenSV.value = true;
      setIsAccountsStatusOpen(true);
    }, [isAccountsStatusOpen, isAccountsStatusOpenSV, onAccountsStatusPress]);

    const closeAccountsStatus = useCallback(() => {
      if (!isAccountsStatusOpen) return;
      isAccountsStatusOpenSV.value = false;
      setIsAccountsStatusOpen(false);
    }, [isAccountsStatusOpen, isAccountsStatusOpenSV]);

    const middleIndex = useMemo(
      () => Math.floor(mainRoutes.length / 2),
      [mainRoutes],
    );

    const menuWidth = Math.min(width, 420);

    const expandableItemSize = useMemo(() => {
      if (isSideMenu) return ExpandableSectionMetrics.largeItemSize;
      return (menuWidth - spacing.XS * 2 - spacing.XS * 3 - 2) / 4;
    }, [isSideMenu, menuWidth]);

    const renderExpandableItem: ListRenderItem<TabButtonProps> = useCallback(
      ({ item }) => {
        const containerStyle = [
          styles.expandableItem,
          {
            width: expandableItemSize,
            height: expandableItemSize,
          },
        ];

        const onPress = () => {
          item.onPress();
          closeMenu();
        };

        return (
          <TabButton
            label={item.label}
            hoveredStyle={styles.hoveredBackground}
            accessibilityLabel={item.accessibilityLabel}
            containerStyle={containerStyle}
            testID={item.testID}
            isFocused={false}
            icon={item.icon}
            onPress={onPress}
            badge={item?.badge ?? undefined}
          />
        );
      },
      [closeMenu],
    );

    const renderMainItem = useCallback(
      (route: TabButtonProps, index: number) => {
        const onPress = () => {
          route.onPress();
          closeMenu();
        };

        return (
          <React.Fragment key={`${route.label}-${index}`}>
            {index === middleIndex && (
              <LaceButton
                isMenuOpen={isMenuOpen}
                onPress={onLacePress}
                {...laceButtonBadge}
              />
            )}
            <TabButton
              containerStyle={styles.tabButton}
              hoveredStyle={styles.hoveredBorder}
              label={route.label}
              accessibilityLabel={route.accessibilityLabel}
              testID={route.testID}
              hideLabel
              isFocused={route.isFocused}
              icon={route.icon}
              onPress={onPress}
              badge={route.badge}
            />
          </React.Fragment>
        );
      },
      [closeMenu, onLacePress, layoutSize, isMenuOpen, laceButtonBadge],
    );

    const renderAccountRow: ListRenderItem<AccountRowProps> = useCallback(
      ({ item }) => {
        return <AccountRow {...item} />;
      },
      [],
    );

    const mainViewHeight = useMemo(
      () =>
        ExpandableSectionMetrics.headerHeight +
        spacing.XS * (Math.ceil(expandableRoutes.length / 4) + 1) +
        expandableItemSize * Math.ceil(expandableRoutes.length / 4) +
        1,
      [expandableItemSize, expandableRoutes.length],
    );

    const accountsStatusHeight = useMemo(
      () =>
        ExpandableSectionMetrics.headerHeight +
        ExpandableSectionMetrics.accountRowHeight *
          Math.min(accountData.length, 3) +
        Math.min(accountData.length, 3),
      [accountData.length],
    );

    const expandableContainerHeight = useDerivedValue(() => {
      const target = isAccountsStatusOpenSV.value
        ? accountsStatusHeight
        : mainViewHeight;
      if (!isMenuOpenSV.value) return target;
      return withTiming(target);
    }, [mainViewHeight, accountsStatusHeight]);

    const sideMenuTop = useMemo(
      () => (windowHeight - mainViewHeight) / 2,
      [windowHeight, mainViewHeight],
    );

    const menuAnimatedStyle = useAnimatedStyle(() => {
      const isOpen = isMenuOpenSV.value;
      return {
        opacity: withTiming(isOpen ? 1 : 0, { duration: ANIMATION_DURATION }),
        transform: isSideMenuSV.value
          ? [
              {
                translateX: withTiming(isOpen ? 0 : -100, {
                  duration: ANIMATION_DURATION,
                }),
              },
            ]
          : [
              {
                translateY: withTiming(isOpen ? 0 : 20, {
                  duration: ANIMATION_DURATION,
                }),
              },
            ],
        height: expandableContainerHeight.value,
      };
    });

    const bottomMenuWidth = useMemo(
      () => Math.max(0, width - spacing.M * 2),
      [width],
    );

    const containerStyle = useMemo(() => {
      return [
        styles.container,
        {
          width: !isSideMenu ? bottomMenuWidth : TabBarMetrics.vertical.width,
        },
      ];
    }, [isSideMenu, bottomMenuWidth, styles.container]);

    return (
      <>
        {isMenuOpen && (
          <Pressable style={styles.closeMenuPressable} onPress={closeMenu} />
        )}
        <Animated.View
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
          style={[
            styles.expandableContainer,
            menuAnimatedStyle,
            isSideMenu
              ? [styles.sideMenuExpanded, { top: sideMenuTop }]
              : styles.bottomMenuExpanded,
          ]}>
          {isMenuOpen && (
            <>
              {!isAndroid && <BlurView style={styles.blur} />}
              {!isAccountsStatusOpen ? (
                <>
                  <View style={styles.expandableHeader}>
                    <Brand height={30} />
                    <View style={styles.pillsContainer}>
                      <Pill.Network
                        network={networkName}
                        onPress={openNetworkSelectionSheet}
                      />
                      <Pill.SyncStatus
                        status={accountsStatus}
                        onPress={openAccountsStatus}
                        syncingProgress={overallSyncingProgress}
                      />
                    </View>
                  </View>
                  <View style={styles.headerBorder} />
                  <FlatList
                    key={'expandableRoutesList'}
                    contentContainerStyle={styles.expandableContent}
                    columnWrapperStyle={styles.columnWrapper}
                    data={expandableRoutes}
                    renderItem={renderExpandableItem}
                    numColumns={4}
                    scrollEnabled={false}
                    keyExtractor={(item, index) => `${item.label}-${index}`}
                  />
                </>
              ) : (
                <>
                  <View style={styles.expandableHeader}>
                    <Button.Secondary
                      size="small"
                      label={t('v2.generic.btn.back')}
                      preIconName="CaretLeft"
                      onPress={closeAccountsStatus}
                    />
                  </View>
                  <FlatList
                    key={'accountDataList'}
                    data={accountData}
                    renderItem={renderAccountRow}
                    scrollEnabled={accountData.length > 3}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item, index) =>
                      `${item.accountName}-${index}`
                    }
                  />
                </>
              )}
            </>
          )}
        </Animated.View>
        <View style={containerStyle}>
          {!isSideMenu && !isAndroid && (
            <View style={smallStyles.blurWrapper}>
              <BlurView style={styles.blur} />
            </View>
          )}
          {mainRoutes.map(renderMainItem)}
          {isSideMenu && <View style={lStyles.sideBorder} />}
        </View>
      </>
    );
  },
  (
    { accountData: previousAccountData, ...restPreviousProps },
    { accountData: nextAccountData, ...restNextProps },
  ) =>
    shallowEqual(restPreviousProps, restNextProps) &&
    previousAccountData.length === nextAccountData.length &&
    nextAccountData.every((nextAccount, index) =>
      shallowEqual(previousAccountData[index], nextAccount),
    ),
);

const sharedStyles = ({
  theme,
  isSideMenu,
}: {
  theme: Theme;
  isSideMenu: boolean;
}) =>
  StyleSheet.create({
    headerBorder: {
      borderBottomWidth: 1,
      borderColor: theme.border.top,
      marginHorizontal: spacing.M,
    },
    closeMenuPressable: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    pillsContainer: { flexDirection: 'row', gap: spacing.XS },
    container: isSideMenu
      ? {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 2,
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.S,
          paddingHorizontal: spacing.S,
        }
      : {
          flexDirection: 'row',
          alignSelf: 'center',
          position: 'absolute',
          maxWidth: '100%',
          height: TabBarMetrics.horizontal.height,
          bottom: TabBarMetrics.horizontal.bottom,
          borderWidth: 1,
          borderRadius: 20,
          borderColor: theme.border.top,
          backgroundColor: isAndroid
            ? theme.background.page
            : theme.background.primary,
          padding: spacing.XS,
        },
    tabButton: isSideMenu
      ? {
          height: 90,
          width: 90,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          gap: spacing.XS,
        }
      : {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.S,
          gap: spacing.XS,
        },
    expandableContainer: {
      position: 'absolute',
      overflow: 'hidden',
      paddingHorizontal: spacing.XS,
      borderWidth: 1,
      borderRadius: radius.M,
      borderColor: theme.border.top,
      backgroundColor: isAndroid
        ? theme.background.page
        : theme.background.primary,
    },
    sideMenuExpanded: {
      width: ExpandableSectionMetrics.largeItemSize * 4 + spacing.XS * 5 + 2,
      zIndex: 1,
      left: TabBarMetrics.vertical.width + spacing.S,
    },
    bottomMenuExpanded: {
      bottom: ExpandableSectionMetrics.bottom,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 420,
    },
    expandableHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.S,
      height: ExpandableSectionMetrics.headerHeight,
    },
    blur: {
      ...StyleSheet.absoluteFillObject,
    },
    expandableContent: {
      paddingVertical: spacing.XS,
      gap: spacing.XS,
    },
    columnWrapper: {
      gap: spacing.XS,
    },
    expandableItem: {
      borderRadius: radius.S,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.XS,
    },
    hoveredBackground: { backgroundColor: theme.background.secondary },
    hoveredBorder: { borderColor: theme.border.top, borderWidth: 1 },
  });

const smallStyles = StyleSheet.create({
  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
});

const largeStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    sideBorder: {
      position: 'absolute',
      height: '95%',
      borderRightWidth: 2,
      borderColor: theme.border.top,
      right: 0,
    },
  });
