/* eslint-disable no-magic-numbers */
import { ReactComponent as SortDirectionAscIcon } from '@lace/icons/dist/SortDirectionAscComponent';
import { ReactComponent as SortDirectionDescIcon } from '@lace/icons/dist/SortDirectionDescComponent';
import { Box, Card, Flex, RadioButtonGroup, SelectGroup, Text, TextBox, ToggleButtonGroup } from '@lace/ui';
import { SortDirection, SortField } from 'features/BrowsePools/StakePoolsTable/types';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';
import * as styles from './SortAndFilter.css';
import { FilterOption, FilterValues, PoolsFilter, SelectOption, SortOption, VisibleSection } from './types';
import { groupedTextBoxStyle } from './utils';

export interface SortAndFilterProps {
  visibleSection: VisibleSection;
  sortedBy: SortField;
  direction: SortDirection;
  filters: FilterValues;
  onSortChange: (sortBy: SortField) => void;
  onDirectionChange: (direction: SortDirection) => void;
  onFiltersChange: (filters: FilterValues) => void;
  onVisibleSectionChange: (section: VisibleSection) => void;
}

export const SortAndFilter = ({
  visibleSection,
  direction,
  filters,
  sortedBy,
  onDirectionChange,
  onSortChange,
  onFiltersChange,
  onVisibleSectionChange,
}: SortAndFilterProps) => {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

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
    onDirectionChange(direction === SortDirection.desc ? SortDirection.asc : SortDirection.desc);
  }, [direction, onDirectionChange]);

  const getFilters = (filter: FilterOption): React.ReactElement => {
    if (filter.type === 'input') {
      return (
        <Flex>
          {(filter.opts as string[]).map((opt, idx) => (
            <TextBox
              key={opt}
              containerStyle={groupedTextBoxStyle(filter.opts.length, idx)}
              containerClassName={styles.groupedInputContainer}
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

  const icon = direction === SortDirection.asc ? SortDirectionAscIcon : SortDirectionDescIcon;

  const sortingOptions: SortOption[] = useMemo(
    () => [
      {
        icon,
        label: 'Ticker name',
        onIconClick,
        value: 'ticker',
      },
      { icon, label: 'Saturation', onIconClick, value: 'saturation' },
      { icon, label: 'ROS', onIconClick, value: 'ros' },
      { icon, label: 'Cost', onIconClick, value: 'cost' },
      { icon, label: 'Margin', onIconClick, value: 'margin' },
      { icon, label: 'Blocks produced', onIconClick, value: 'blocks' },
      { icon, label: 'Pledge', onIconClick, value: 'pledge' },
      { icon, label: 'Live stake', onIconClick, value: 'livestake' },
    ],
    [icon, onIconClick]
  );

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
    <Card.Outlined style={{ width: 340 }}>
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
          <Flex justifyContent="flex-start">
            <RadioButtonGroup
              options={sortingOptions}
              selectedValue={sortedBy}
              onValueChange={(value) => onSortChange(value as SortField)}
            />
          </Flex>
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
