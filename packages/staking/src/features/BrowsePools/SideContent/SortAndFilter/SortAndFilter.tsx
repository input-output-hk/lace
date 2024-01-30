/* eslint-disable no-magic-numbers */
import { ReactComponent as SortDirectionIcon } from '@lace/icons/dist/SortDirectionComponent';
import { Card, Flex, RadioButtonGroup, SelectGroup, Text, TextBox, ToggleButtonGroup } from '@lace/ui';
import { SortDirection, SortField } from 'features/BrowsePools/StakePoolsTable/types';
import { useMemo, useState } from 'react';
import * as styles from './SortAndFilter.css';
import { FilterOption, FilterValues, PoolsFilter, SelectOption, SortOption, VisibleSection } from './types';
import { groupedTextBoxStyle } from './utils';

export interface SortAndFilterProps {
  sortedBy: SortField;
  direction: SortDirection;
  filters: FilterValues;
  onSortChange: (sortBy: SortField) => void;
  onDirectionChange: (direction: SortDirection) => void;
  onFilterChange: (key: PoolsFilter, optIndex: number, value: string) => void;
}

export const SortAndFilter = ({
  direction,
  filters,
  sortedBy,
  onDirectionChange,
  onSortChange,
  onFilterChange,
}: SortAndFilterProps) => {
  const [visibleSection, setVisibleSection] = useState<VisibleSection>('sorting');

  const onIconClick = () => {
    onDirectionChange(direction === SortDirection.desc ? SortDirection.asc : SortDirection.desc);
  };

  const getFilters = (filter: FilterOption): React.ReactElement => {
    if (filter.type === 'input') {
      return (
        <>
          {(filter.opts as string[]).map((opt, idx) => (
            <TextBox
              key={opt}
              containerStyle={groupedTextBoxStyle(filter.opts.length, idx)}
              containerClassName={styles.groupedInputContainer}
              label={opt}
              value={filters[filter.key][idx]}
              onChange={(e) => onFilterChange(filter.key, idx, e.target.value)}
            />
          ))}
        </>
      );
    }

    const selectedValue =
      (filter.opts as SelectOption[]).find((opt) => opt.value === filters[filter.key][0])?.value ?? '';

    return (
      <SelectGroup
        onValueChange={(value) => onFilterChange(filter.key, 0, value)}
        showArrow
        withOutline
        placeholder=""
        options={filter.opts as SelectOption[]}
        selectedValue={selectedValue}
      />
    );
  };

  const sortingOptions: SortOption[] = [
    {
      icon: SortDirectionIcon,
      label: 'Ticker name',
      onIconClick,
      value: 'ticker',
    },
    { icon: SortDirectionIcon, label: 'Saturation', onIconClick, value: 'saturation' },
    { icon: SortDirectionIcon, label: 'ROS', onIconClick, value: 'ros' },
    { icon: SortDirectionIcon, label: 'Cost', onIconClick, value: 'cost' },
    { icon: SortDirectionIcon, label: 'Margin', onIconClick, value: 'margin' },
    { icon: SortDirectionIcon, label: 'Blocks produced', onIconClick, value: 'blocks' },
    { icon: SortDirectionIcon, label: 'Pledge', onIconClick, value: 'pledge' },
    { icon: SortDirectionIcon, label: 'Live stake', onIconClick, value: 'livestake' },
  ];

  const filterOptions: FilterOption[] = useMemo(
    () => [
      {
        key: PoolsFilter.Saturation,
        opts: ['From', 'To'],
        title: 'Ctrl. Stake',
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
          { label: 'Last epoch', selected: filters[PoolsFilter.Ros][0] === 'lastepoch', value: 'lastepoch' },
          { label: 'other', selected: filters[PoolsFilter.Ros][0] === 'lastepoch', value: 'other' },
        ],
        title: 'ROS',
        type: 'select',
      },
    ],
    [filters]
  );

  console.debug({ filterOptions });

  return (
    <Card.Outlined style={{ width: 340 }}>
      <Flex flexDirection="column" justifyContent="flex-start" alignItems="stretch" my="$32" mx="$32" gap="$20">
        <Text.SubHeading weight="$bold">More options</Text.SubHeading>
        <ToggleButtonGroup.Root
          value={visibleSection}
          onValueChange={(value) => setVisibleSection(value as VisibleSection)}
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
              <Flex
                flexDirection="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                h="$fill"
                m="$4"
                key={filter.title}
              >
                <Flex>
                  <Text.Body.Large weight="$medium">{filter.title}</Text.Body.Large>
                </Flex>
                <Flex>{getFilters(filter)}</Flex>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
