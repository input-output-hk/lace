import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  InteractionManager,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, radius, spacing } from '../../../design-tokens';
import {
  Column,
  Text,
  Divider,
  BlurView,
  Icon,
  Avatar,
  Row,
} from '../../atoms';
import { Toggle } from '../../atoms/toggle/toggle';
import { useDropdownPosition } from '../../util/hooks/useDropdownPosition';

import { isDropdownMenuItemSelected } from './dropdownMenu.utils';

import type { Theme } from '../../../design-tokens';
import type { AvatarContent } from '../../../utils/avatarUtils';
import type { IconName } from '../../atoms/icons/Icon';

const ITEM_HEIGHT = 60;
const MAX_VISIBLE_ITEMS = 4;

export type DropdownMenuItemToggle = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export type DropdownMenuItem = {
  id: string;
  text: string;
  icon?: IconName;
  avatar?: AvatarContent;
  leftIcon?: IconName;
  disabled?: boolean;
  toggle?: DropdownMenuItemToggle;
};

export type DropdownMenuProps = {
  items: (DropdownMenuItem | string)[];
  title?: string;
  /** The id (for DropdownMenuItem objects) or label/text value (for string items) of the selected item */
  selectedItemId?: string;
  onSelectItem?: (index: number) => void;
  titleAvatar?: AvatarContent;
  titleLeftIcon?: IconName;
  showActionButton?: boolean;
  onActionPress?: () => void;
  actionText?: string;
  maxVisibleItems?: number;
  animationDuration?: number;
  /**
   * Fixed width for the dropdown list in pixels.
   * When wider than the trigger button the list right-aligns to the trigger's
   * right edge so it never overflows off-screen.
   * Defaults to the trigger button width.
   */
  dropdownWidth?: number;
  testID?: string;
};

const MenuItem = React.memo(
  ({
    item,
    index,
    selectedItemId,
    onPress,
    isLastItem,
    theme,
  }: {
    item: DropdownMenuItem;
    index: number;
    selectedItemId?: string;
    onPress: (index: number) => void;
    isLastItem: boolean;
    theme: Theme;
  }) => {
    const defaultStyles = useMemo(() => styles(theme), [theme]);
    const isSelected = isDropdownMenuItemSelected(item, selectedItemId);
    const isDisabled = item.disabled;
    const hasToggle = !!item.toggle;

    const handlePress = () => {
      if (isDisabled) return;
      if (hasToggle) {
        item.toggle!.onValueChange(!item.toggle!.value);
      } else {
        onPress(index);
      }
    };

    return (
      <Column>
        <Pressable
          style={[
            defaultStyles.item,
            isSelected && defaultStyles.selectedItem,
            isDisabled && defaultStyles.disabledItem,
          ]}
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityRole={hasToggle ? 'switch' : 'button'}
          accessibilityLabel={item.text}
          accessibilityState={{
            selected: isSelected,
            disabled: isDisabled,
            checked: hasToggle ? item.toggle!.value : undefined,
          }}
          testID={`dropdown-menu-item-${index}`}>
          {!!item.avatar && (
            <Avatar
              size={spacing.XL}
              shape="rounded"
              content={item.avatar}
              testID={`dropdown-menu-item-${index}-avatar`}
            />
          )}

          {!!item.leftIcon && (
            <Icon
              name={item.leftIcon}
              size={16}
              testID={`dropdown-menu-item-${index}-left-icon`}
            />
          )}

          <Text.S
            style={[
              defaultStyles.text,
              isDisabled && defaultStyles.disabledText,
            ]}
            testID={`dropdown-menu-item-${index}-text`}>
            {item.text}
          </Text.S>

          {hasToggle ? (
            <View pointerEvents="none">
              <Toggle
                value={item.toggle!.value}
                testID={`dropdown-menu-item-${index}-toggle`}
              />
            </View>
          ) : item.icon ? (
            <Icon
              name={item.icon}
              size={16}
              testID={`dropdown-menu-item-${index}-icon`}
            />
          ) : (
            isSelected && (
              <Icon
                name="Tick"
                size={16}
                testID={`dropdown-menu-item-${index}-tick`}
              />
            )
          )}
        </Pressable>
        {!isLastItem && <Divider />}
      </Column>
    );
  },
);

export const DropdownMenu = React.memo(
  ({
    items,
    title,
    selectedItemId,
    onSelectItem,
    titleAvatar,
    titleLeftIcon,
    showActionButton = false,
    onActionPress,
    actionText,
    maxVisibleItems = MAX_VISIBLE_ITEMS,
    animationDuration = 300,
    dropdownWidth,
    testID,
  }: DropdownMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const progress = useSharedValue(0);
    const triggerRef = useRef<View | null>(null);
    const isKeyboardVisibleRef = useRef(false);
    const { theme } = useTheme();

    const defaultStyles = useMemo(() => styles(theme), [theme]);

    const normalizedItems = useMemo<DropdownMenuItem[]>(
      () =>
        (items ?? []).map((item, index) =>
          typeof item === 'string'
            ? { id: `${item}-${index}`, text: item }
            : item,
        ),
      [items],
    );

    const maxHeight = useMemo(
      () =>
        Math.min(normalizedItems.length, maxVisibleItems) * ITEM_HEIGHT +
        spacing.S,
      [normalizedItems.length, maxVisibleItems],
    );

    const { layout, shouldOpenUpwards, measure } =
      useDropdownPosition(maxHeight);

    const containerStyle = useMemo(() => {
      if (!layout) return null;

      const listWidth = dropdownWidth ?? layout.width;
      // When the list is wider than the trigger, right-align to the trigger's
      // right edge so it expands leftward and stays within the screen.
      const left =
        listWidth > layout.width
          ? Math.max(0, layout.x + layout.width - listWidth)
          : layout.x;

      const base = { left, width: listWidth };

      return shouldOpenUpwards
        ? {
            ...base,
            top: Math.max(spacing.XS, layout.y - maxHeight - spacing.XS),
          }
        : { ...base, top: layout.y + layout.height + spacing.XS };
    }, [layout, maxHeight, shouldOpenUpwards, dropdownWidth]);

    useEffect(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', () => {
        isKeyboardVisibleRef.current = true;
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        isKeyboardVisibleRef.current = false;
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const measureNow = () => {
      measure(triggerRef.current);
    };

    const doOpen = () => {
      setIsOpen(true);
      progress.value = withTiming(1, { duration: animationDuration });
      requestAnimationFrame(measureNow);
      setTimeout(measureNow, 250);
    };

    const afterSettle = () => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => requestAnimationFrame(doOpen), 50);
      });
    };

    const openMenu = () => {
      if (isKeyboardVisibleRef.current) {
        let didHide = false;
        const sub = Keyboard.addListener('keyboardDidHide', () => {
          didHide = true;
          sub.remove();
          afterSettle();
        });

        Keyboard.dismiss();

        setTimeout(() => {
          if (!didHide) {
            sub.remove();
            afterSettle();
          }
        }, 350);

        return;
      }

      afterSettle();
    };

    const closeMenu = () => {
      progress.value = withTiming(0, { duration: animationDuration }, () => {
        runOnJS(setIsOpen)(false);
      });
    };

    const toggleMenu = () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    const handleSelect = (index: number) => {
      onSelectItem?.(index);
      if (!normalizedItems[index]?.toggle) {
        closeMenu();
      }
    };

    const animatedStyle = useAnimatedStyle(() => {
      const translateFrom = shouldOpenUpwards
        ? MAX_VISIBLE_ITEMS
        : -MAX_VISIBLE_ITEMS;

      return {
        height: interpolate(progress.value, [0, 1], [0, maxHeight]),
        opacity: progress.value,
        transform: [
          {
            translateY: interpolate(progress.value, [0, 1], [translateFrom, 0]),
          },
        ],
      };
    }, [maxHeight, shouldOpenUpwards]);

    const animatedContainer = useMemo(() => {
      return [containerStyle, animatedStyle];
    }, [containerStyle, animatedStyle]);

    return (
      <Column style={defaultStyles.dropdownContainer} gap={spacing.S}>
        <Pressable
          ref={triggerRef}
          style={defaultStyles.pressable}
          onPress={toggleMenu}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={title}
          testID={testID ? `${testID}-button` : 'dropdown-button'}>
          {!!titleAvatar && (
            <Avatar
              size={spacing.XL}
              shape="rounded"
              content={titleAvatar}
              testID={testID ? `${testID}-avatar` : 'dropdown-avatar'}
            />
          )}

          {!!titleLeftIcon && <Icon name={titleLeftIcon} size={16} />}

          <Text.XS
            style={defaultStyles.text}
            testID={testID ? `${testID}-title` : 'dropdown-button-title'}>
            {title}
          </Text.XS>

          <Row alignItems="center" gap={spacing.S}>
            {!!actionText && (
              <Text.XS
                variant="secondary"
                testID={
                  testID ? `${testID}-action-text` : 'dropdown-action-text'
                }>
                {actionText}
              </Text.XS>
            )}

            {showActionButton && onActionPress && (
              <Pressable
                onPress={onActionPress}
                testID={
                  testID ? `${testID}-action-button` : 'dropdown-action-button'
                }>
                <Icon name="Cancel" size={18} />
              </Pressable>
            )}

            <Icon
              name={isOpen ? 'CaretUp' : 'CaretDown'}
              size={18}
              testID={testID ? `${testID}-title-icon` : 'dropdown-title-icon'}
            />
          </Row>
        </Pressable>

        <Modal transparent visible={isOpen} animationType="none">
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={closeMenu}
            />

            <Animated.View
              style={[defaultStyles.modalDropdown, animatedContainer]}>
              <BlurView style={defaultStyles.blurView}>
                <FlatList
                  testID={testID || 'dropdown-menu'}
                  data={normalizedItems}
                  keyExtractor={item => item.id}
                  renderItem={({ item, index }) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      index={index}
                      selectedItemId={selectedItemId}
                      onPress={handleSelect}
                      isLastItem={index === normalizedItems.length - 1}
                      theme={theme}
                    />
                  )}
                  showsVerticalScrollIndicator={
                    normalizedItems.length > maxVisibleItems
                  }
                  contentContainerStyle={defaultStyles.contentContainer}
                />
              </BlurView>
            </Animated.View>
          </View>
        </Modal>
      </Column>
    );
  },
);

const styles = (theme: Theme) =>
  StyleSheet.create({
    dropdownContainer: {
      width: '100%',
      zIndex: 1,
    },
    pressable: {
      borderRadius: radius.S,
      backgroundColor: theme.background.secondary,
      height: ITEM_HEIGHT,
      flexDirection: 'row',
      gap: spacing.S,
      alignItems: 'center',
      paddingHorizontal: spacing.M,
    },
    text: {
      flex: 1,
    },
    modalDropdown: {
      position: 'absolute',
      backgroundColor: theme.background.primary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      overflow: 'hidden',
      zIndex: 3,
    },
    item: {
      minHeight: ITEM_HEIGHT,
      paddingHorizontal: spacing.M,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
    },
    selectedItem: {
      backgroundColor: theme.extra.shadowInnerStrong,
      margin: spacing.XS,
      borderRadius: radius.S,
    },
    blurView: {
      borderRadius: radius.S,
      flex: 1,
    },
    disabledItem: {
      backgroundColor: theme.background.tertiary,
    },
    disabledText: {
      color: theme.text.tertiary,
    },
    contentContainer: {
      backgroundColor: theme.background.primary,
    },
  });
