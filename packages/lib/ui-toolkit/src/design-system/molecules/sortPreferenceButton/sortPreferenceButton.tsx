import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Column, Icon, Row, Text } from '../../../design-system/atoms';
import { spacing, radius, useTheme, type Theme } from '../../../design-tokens';
import { OPTIONS, ORDERS } from '../../../utils/browsePoolUtils';

import type {
  BrowsePoolSortOption,
  BrowsePoolSortOrder,
} from '../../../design-system/util/types';
import type { TranslationKey } from '@lace-contract/i18n';

type Props = {
  option?: BrowsePoolSortOption;
  order: BrowsePoolSortOrder;
  onToggleOrder: () => void;
  testID?: string;
};

const isAlphabetical = (option?: BrowsePoolSortOption) =>
  option === OPTIONS.TICKER;

const SORT_ORDER_VALUE_KEYS = {
  A: 'v2.pages.browse-pool.more-options.sort-order.value.a',
  Z: 'v2.pages.browse-pool.more-options.sort-order.value.z',
  ONE: 'v2.pages.browse-pool.more-options.sort-order.value.one',
  NINE: 'v2.pages.browse-pool.more-options.sort-order.value.nine',
} satisfies Record<string, TranslationKey>;

const FromToColumn = ({ from, to }: { from: string; to: string }) => (
  <Column gap={0} alignItems="center">
    <Text.XS>{from}</Text.XS>
    <Text.XS>{to}</Text.XS>
  </Column>
);

export const SortPreferenceButton = ({
  option,
  order,
  onToggleOrder,
  testID = 'browse-pool-sort-order',
}: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const isDisabled = option === undefined;

  const isAscendingOrder = order === ORDERS.ASC;

  const { fromKey, toKey } = useMemo(() => {
    const effectiveOption: BrowsePoolSortOption = option ?? OPTIONS.TICKER;

    if (isAlphabetical(effectiveOption)) {
      return isAscendingOrder
        ? {
            fromKey: SORT_ORDER_VALUE_KEYS.A,
            toKey: SORT_ORDER_VALUE_KEYS.Z,
          }
        : {
            fromKey: SORT_ORDER_VALUE_KEYS.Z,
            toKey: SORT_ORDER_VALUE_KEYS.A,
          };
    }

    return isAscendingOrder
      ? {
          fromKey: SORT_ORDER_VALUE_KEYS.ONE,
          toKey: SORT_ORDER_VALUE_KEYS.NINE,
        }
      : {
          fromKey: SORT_ORDER_VALUE_KEYS.NINE,
          toKey: SORT_ORDER_VALUE_KEYS.ONE,
        };
  }, [isAscendingOrder, option]);

  const arrow = isAscendingOrder ? 'ArrowUp' : 'ArrowDown';

  return (
    <Pressable
      onPress={onToggleOrder}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        isDisabled ? styles.disabled : pressed && { opacity: 0.8 },
      ]}>
      <Row gap={spacing.S} alignItems="center">
        <FromToColumn from={t(fromKey)} to={t(toKey)} />
        <Icon name={arrow} size={18} />
      </Row>
    </Pressable>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.S,
      borderRadius: radius.S,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.brand.lightGray,
      backgroundColor: theme.background.primary,
    },
    disabled: {
      backgroundColor: theme.background.tertiary,
    },
  });
