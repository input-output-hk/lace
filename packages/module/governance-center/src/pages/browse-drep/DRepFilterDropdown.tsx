import { useTranslation } from '@lace-contract/i18n';
import {
  Divider,
  Icon,
  radius,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import type { DRepSortBy, DRepStatus } from '@lace-contract/governance-center';

// Window-anchored coordinates for the popover panel. Measured from the trigger
// so the dropdown drops directly below the filter icon, right-aligned to it.
type Anchor = { top: number; right: number };

const PANEL_WIDTH = 240;

type DRepFilterDropdownProps = {
  status: DRepStatus;
  sortBy: DRepSortBy;
  onStatusChange: (status: DRepStatus) => void;
  onSortByChange: (sortBy: DRepSortBy) => void;
  isActive?: boolean;
};

export const DRepFilterDropdown = ({
  status,
  sortBy,
  onStatusChange,
  onSortByChange,
  isActive = false,
}: DRepFilterDropdownProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  // Rendered in a root-level Modal (not inline) so the panel is never clipped
  // by the surrounding bottom sheet / list, on both web and native.
  const open = useCallback(() => {
    triggerRef.current?.measureInWindow(
      // eslint-disable-next-line max-params -- measureInWindow's callback signature is fixed by React Native (x, y, width, height).
      (x, y, triggerWidth, triggerHeight) => {
        setAnchor({
          top: y + triggerHeight + spacing.XS,
          right: Math.max(spacing.M, width - (x + triggerWidth)),
        });
      },
    );
  }, [width]);

  const close = useCallback(() => {
    setAnchor(null);
  }, []);

  const statusOptions: { id: DRepStatus; label: string }[] = [
    { id: 'all', label: t('v2.governance.dreps-filter.status.all') },
    { id: 'active', label: t('v2.governance.dreps-filter.status.active') },
    { id: 'inactive', label: t('v2.governance.dreps-filter.status.inactive') },
    { id: 'retired', label: t('v2.governance.dreps-filter.status.retired') },
  ];

  const sortOptions: { id: DRepSortBy; label: string }[] = [
    {
      id: 'votingPower',
      label: t('v2.governance.dreps-filter.sort-by.voting-power'),
    },
    { id: 'status', label: t('v2.governance.dreps-filter.sort-by.status') },
  ];

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={open}
        hitSlop={spacing.S}
        style={[
          styles.trigger,
          isActive && { backgroundColor: theme.background.secondary },
        ]}
        accessibilityRole="button"
        testID="browse-drep-filter-button">
        <Icon name="Filter" size={20} />
      </Pressable>

      <Modal
        transparent
        visible={anchor !== null}
        animationType="fade"
        onRequestClose={close}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          testID="browse-drep-filter-backdrop"
        />
        {anchor !== null && (
          <View
            style={[
              styles.panel,
              {
                top: anchor.top,
                right: anchor.right,
                backgroundColor: theme.background.primary,
                borderColor: theme.border.middle,
                // shadowColor is dynamic (theme); the remaining shadow props are
                // static in styles.panel. boxShadow is web/DOM-only and would
                // drop on iOS/Android, leaving the popover flat.
                shadowColor: theme.extra.shadowDrop,
              },
            ]}
            testID="browse-drep-filter-dropdown">
            <Text.XS variant="secondary" style={styles.groupLabel}>
              {t('v2.governance.dreps-filter.status')}
            </Text.XS>
            {statusOptions.map(option => (
              <Pressable
                key={option.id}
                onPress={() => {
                  onStatusChange(option.id);
                }}
                style={styles.row}
                testID={`browse-drep-filter-status-${option.id}`}>
                <Text.S>{option.label}</Text.S>
                {status === option.id && <Icon name="Tick" size={16} />}
              </Pressable>
            ))}

            <Divider />

            <Text.XS variant="secondary" style={styles.groupLabel}>
              {t('v2.governance.dreps-filter.sort-by')}
            </Text.XS>
            {sortOptions.map(option => (
              <Pressable
                key={option.id}
                onPress={() => {
                  onSortByChange(option.id);
                }}
                style={styles.row}
                testID={`browse-drep-filter-sort-${option.id}`}>
                <Text.S>{option.label}</Text.S>
                {sortBy === option.id && <Icon name="Tick" size={16} />}
              </Pressable>
            ))}
          </View>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    padding: spacing.XS,
    borderRadius: radius.S,
  },
  panel: {
    position: 'absolute',
    width: PANEL_WIDTH,
    borderRadius: radius.S,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.XS,
    paddingHorizontal: spacing.S,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  groupLabel: {
    paddingHorizontal: spacing.XS,
    paddingTop: spacing.S,
    paddingBottom: spacing.XS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.S,
    paddingHorizontal: spacing.XS,
    minHeight: 40,
  },
});
