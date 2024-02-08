/* eslint-disable no-magic-numbers */
import { ReactComponent as SortDirectionAscIcon } from '@lace/icons/dist/SortDirectionAscComponent';
import { ReactComponent as SortDirectionDescIcon } from '@lace/icons/dist/SortDirectionDescComponent';
import { Box, Card, Flex, RadioButtonGroup, SelectGroup, Text, TextBox, ToggleButtonGroup } from '@lace/ui';
import cn from 'classnames';
import { Columns, SortDirection, SortField, StakePoolSortOptions } from 'features/BrowsePools/StakePoolsTable/types';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as styles from './SortAndFilter.css';
import { FilterOption, FilterValues, PoolsFilter, SelectOption, SortOption, VisibleSection } from './types';

export interface SortAndFilterProps {
  visibleSection: VisibleSection;
  sortAndDirection: StakePoolSortOptions;
  filters: FilterValues;
  onSortAndDirectionChange: (value: StakePoolSortOptions) => void;
  onFiltersChange: (filters: FilterValues) => void;
  onVisibleSectionChange: (section: VisibleSection) => void;
}

export const SortAndFilter = ({
  visibleSection,
  filters,
  sortAndDirection,
  onFiltersChange,
  onVisibleSectionChange,
  onSortAndDirectionChange,
}: SortAndFilterProps) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);
  const { field: sortBy, order: direction } = sortAndDirection;

  const debouncedFilterChange = useMemo(() => debounce(onFiltersChange, 400), [onFiltersChange]);
  const onLocalFilterChange = (key: PoolsFilter, optIndex: number, value: string) => {
    const newFilters = {
      ...localFilters,
    };
    newFilters[key][optIndex] = value;
    setLocalFilters(newFilters);
    debouncedFilterChange(newFilters);
  };

  const onIconClick = useCallback(() => {
    const newSort: StakePoolSortOptions = {
      field: sortBy,
      order: direction === SortDirection.desc ? SortDirection.asc : SortDirection.desc,
    };
    onSortAndDirectionChange(newSort);
  }, [direction, onSortAndDirectionChange, sortBy]);

  const onSortChange = useCallback(
    (field: Columns) => {
      // TODO: remove once updated on sdk side (LW-9530)
      if (!Object.keys(SortField).includes(field)) {
        console.debug(`Sort not supported by ${field}`);
        return;
      }
      const newSort: StakePoolSortOptions = {
        field: field as unknown as SortField,
        order: direction,
      };
      onSortAndDirectionChange(newSort);
    },
    [direction, onSortAndDirectionChange]
  );

  const getFilters = (filter: FilterOption): React.ReactElement => {
    if (filter.type === 'input') {
      return (
        <Flex>
          {(filter.opts as string[]).map((opt, idx) => (
            <TextBox
              key={opt}
              containerClassName={cn(
                filter.opts.length > 1 && {
                  [styles.textBoxLeft]: idx === 0,
                  [styles.textBoxRight]: idx === filter.opts.length - 1,
                }
              )}
              label={opt}
              value={localFilters[filter.key][idx]}
              onChange={(e) => onLocalFilterChange(filter.key, idx, e.target.value)}
            />
          ))}
        </Flex>
      );
    }

    const selectedValue =
      (filter.opts as SelectOption[]).find((opt) => opt.value === localFilters[filter.key][0])?.value ?? '';

    return (
      <SelectGroup
        onValueChange={(value) => onLocalFilterChange(filter.key, 0, value)}
        showArrow
        withOutline
        className={styles.selectGroup}
        placeholder="Select"
        options={filter.opts as SelectOption[]}
        selectedValue={selectedValue}
      />
    );
  };

  const sortingOptions: SortOption[] = useMemo(() => {
    const icon = direction === SortDirection.asc ? <SortDirectionAscIcon /> : <SortDirectionDescIcon />;
    return [
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.ticker'),
        onIconClick,
        value: Columns.ticker,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.saturation'),
        onIconClick,
        value: Columns.saturation,
      },
      { icon, label: t('browsePools.stakePoolTableBrowser.sortByTitle.ros'), onIconClick, value: Columns.apy },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.cost'),
        onIconClick,
        value: Columns.cost,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.margin'),
        onIconClick,
        value: Columns.margin,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.blocks'),
        onIconClick,
        value: Columns.blocks,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.pledge'),
        onIconClick,
        value: Columns.pledge,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.livestake'),
        onIconClick,
        value: Columns.liveStake,
      },
    ];
  }, [direction, onIconClick, t]);

  const filterOptions: FilterOption[] = useMemo(
    () => [
      {
        key: PoolsFilter.Saturation,
        opts: ['From', 'To'],
        title: 'Saturation',
        type: 'input',
      },
      {
        key: PoolsFilter.ProfitMargin,
        opts: ['From', 'To'],
        title: 'Profit Margin',
        type: 'input',
      },
      {
        key: PoolsFilter.Performance,
        opts: ['From', 'To'],
        title: 'Performance',
        type: 'input',
      },
      {
        key: PoolsFilter.Ros,
        opts: [
          { label: 'Last epoch', selected: localFilters[PoolsFilter.Ros][0] === 'lastepoch', value: 'lastepoch' },
          { label: 'other', selected: localFilters[PoolsFilter.Ros][0] === 'lastepoch', value: 'other' },
        ],
        title: 'ROS',
        type: 'select',
      },
    ],
    [localFilters]
  );

  return (
    <Card.Outlined className={styles.card}>
      <Flex flexDirection="column" justifyContent="flex-start" alignItems="stretch" my="$32" mx="$32" gap="$20">
        <Text.SubHeading weight="$bold">More options</Text.SubHeading>
        <ToggleButtonGroup.Root
          value={visibleSection}
          onValueChange={(value) => onVisibleSectionChange(value as VisibleSection)}
        >
          <ToggleButtonGroup.Item value="sorting">Sorting</ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="filtering">Filters</ToggleButtonGroup.Item>
        </ToggleButtonGroup.Root>
        {visibleSection === 'sorting' ? (
          <RadioButtonGroup
            className={styles.radioGroup}
            options={sortingOptions}
            selectedValue={sortBy}
            onValueChange={(value) => onSortChange(value as Columns)}
          />
        ) : (
          <Flex flexDirection="column" justifyContent="stretch" alignItems="stretch">
            {filterOptions.map((filter) => (
              <Flex flexDirection="column" m="$4" key={filter.title} alignItems="stretch">
                <Text.Body.Small weight="$medium">{filter.title}</Text.Body.Small>
                <Box>{getFilters(filter)}</Box>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
