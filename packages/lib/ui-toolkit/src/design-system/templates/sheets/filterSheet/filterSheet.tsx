import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Row, Text } from '../../../atoms';
import {
  DropdownMenu,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms/icons/Icon';
import type { DropdownMenuItem } from '../../../molecules/dropdownMenu/dropdownMenu';

export interface FilterDropdownConfig {
  label: string;
  rightNode?: React.ReactNode;
  items: (DropdownMenuItem | string)[];
  selectedItemId?: string;
  onSelectItem: (index: number) => void;
  onClear?: () => void;
  selectedItemIcon?: IconName;
  selectedItemAvatar?: { fallback: string; img?: { uri: string } };
  testID?: string;
}

export interface FilterSheetProps {
  title: string;
  dropdowns: FilterDropdownConfig[];
  onConfirm: () => void;
  onCancel: () => void;
  cancelButtonLabel: string;
  confirmButtonLabel: string;
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
    <Column gap={spacing.S}>
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
  title,
  dropdowns,
  onConfirm,
  onCancel,
  cancelButtonLabel,
  confirmButtonLabel,
  testID = 'filter-sheet',
}: FilterSheetProps) => {
  const footerHeight = useFooterHeight();
  const containerStyle = useMemo(
    () => [styles.container, { paddingBottom: footerHeight }],
    [footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} testID={`${testID}-header`} />
      <Sheet.Scroll testID={testID} contentContainerStyle={containerStyle}>
        <Column gap={spacing.L} style={styles.content}>
          {dropdowns.map((dropdown, index) => (
            <FilterDropdownItem
              key={index}
              dropdown={dropdown}
              index={index}
              testID={testID}
            />
          ))}
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: cancelButtonLabel,
          onPress: onCancel,
          testID: `${testID}-cancel`,
        }}
        primaryButton={{
          label: confirmButtonLabel,
          onPress: onConfirm,
          testID: `${testID}-confirm`,
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.M,
  },
  content: {
    paddingTop: spacing.M,
  },
  label: {
    marginBottom: spacing.XS,
  },
  dropdownWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
});
