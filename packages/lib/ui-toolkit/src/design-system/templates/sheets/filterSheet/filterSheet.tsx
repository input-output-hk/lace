import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Row, Text } from '../../../atoms';
import { DropdownMenu, DropdownMenuViewport } from '../../../molecules';
import { footerHeight } from '../../../organisms';

import type { IconName } from '../../../atoms/icons/Icon';
import type { DropdownMenuItem } from '../../../molecules/dropdownMenu/dropdownMenu';

export interface FilterDropdownConfig {
  label: string;
  rightNode?: React.ReactNode;
  items: (DropdownMenuItem | string)[];
  selectedItemId?: string;
  shouldOpenUpwards?: boolean;
  onSelectItem: (index: number) => void;
  onClear?: () => void;
  selectedItemIcon?: IconName;
  selectedItemAvatar?: { fallback: string; img?: { uri: string } };
  testID?: string;
}

export interface FilterSheetProps {
  title?: string;
  dropdowns: FilterDropdownConfig[];
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelButtonLabel?: string;
  confirmButtonLabel?: string;
  testID?: string;
}

const FilterDropdownItem = ({
  dropdown,
  index,
  testID,
}: {
  dropdown: FilterDropdownConfig;
  index: number;
  testID: string;
}) => {
  const selectedItemText = useMemo(() => {
    if (!dropdown.selectedItemId) return undefined;

    const item = dropdown.items.find(indexItem => {
      if (typeof indexItem === 'string') {
        return indexItem === dropdown.selectedItemId;
      }
      return (
        indexItem.id === dropdown.selectedItemId ||
        indexItem.text === dropdown.selectedItemId
      );
    });

    return typeof item === 'string' ? item : item?.text;
  }, [dropdown.items, dropdown.selectedItemId]);

  const selectedItemData = useMemo<DropdownMenuItem | undefined>(() => {
    if (!dropdown.selectedItemId) return undefined;

    const item = dropdown.items.find(
      indexItem =>
        typeof indexItem !== 'string' &&
        (indexItem.id === dropdown.selectedItemId ||
          indexItem.text === dropdown.selectedItemId),
    );

    return typeof item === 'string' ? undefined : item;
  }, [dropdown.items, dropdown.selectedItemId]);

  const handleSelectItem = useCallback(
    (itemIndex: number) => {
      dropdown.onSelectItem(itemIndex);
    },
    [dropdown],
  );

  return (
    <Column gap={spacing.XL}>
      <Row justifyContent="space-between" alignItems="center">
        <Text.S
          variant="secondary"
          style={styles.label}
          testID={`${testID}-dropdown-label`}>
          {dropdown.label}
        </Text.S>
        {dropdown.rightNode}
      </Row>
      <View
        style={styles.dropdownWrapper}
        testID={`${testID}-dropdown-wrapper`}>
        <DropdownMenu
          items={dropdown.items}
          title={selectedItemText || dropdown.selectedItemId || dropdown.label}
          selectedItemId={dropdown.selectedItemId}
          shouldOpenUpwards={dropdown.shouldOpenUpwards}
          onSelectItem={handleSelectItem}
          titleLeftIcon={
            selectedItemData?.leftIcon || dropdown.selectedItemIcon
          }
          titleAvatar={selectedItemData?.avatar || dropdown.selectedItemAvatar}
          showActionButton={!!dropdown.selectedItemId && !!dropdown.onClear}
          onActionPress={() => {
            dropdown.onClear?.();
          }}
          testID={dropdown.testID || `${testID}-dropdown-${index}`}
        />
      </View>
    </Column>
  );
};

export const FilterSheet = ({
  dropdowns,
  testID = 'filter-sheet',
}: FilterSheetProps) => {
  const boundaryInsets = useMemo(
    () => ({ top: spacing.M, bottom: footerHeight.horizontal }),
    [],
  );

  return (
    <DropdownMenuViewport
      style={styles.content}
      testID={testID}
      boundaryInsets={boundaryInsets}>
      <Column gap={spacing.L} style={styles.contentWrapper}>
        {dropdowns.map((dropdown, index) => (
          <FilterDropdownItem
            key={index}
            dropdown={dropdown}
            index={index}
            testID={testID}
          />
        ))}
      </Column>
    </DropdownMenuViewport>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    minHeight: 400,
  },
  content: {
    paddingTop: spacing.M,
    paddingBottom: footerHeight.horizontal,
    paddingHorizontal: spacing.M,
  },
  label: {
    marginBottom: spacing.XS,
  },
  dropdownWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
});
