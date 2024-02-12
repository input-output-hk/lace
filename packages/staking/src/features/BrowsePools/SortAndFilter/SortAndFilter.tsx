import { ReactComponent as SortDirectionAscIcon } from '@lace/icons/dist/SortDirectionAscComponent';
import { ReactComponent as SortDirectionDescIcon } from '@lace/icons/dist/SortDirectionDescComponent';
import {
  Card,
  Flex,
  RadioButtonGroup,
  RadioButtonGroupOption,
  SelectGroup,
  Text,
  TextBox,
  ToggleButtonGroup,
} from '@lace/ui';
import cn from 'classnames';
import { Columns, SortDirection, SortField, StakePoolSortOptions } from 'features/BrowsePools/StakePoolsTable/types';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as styles from './SortAndFilter.css';
import { FilterOption, FilterValues, PoolsFilter, SelectOption, SortAndFilterTab } from './types';

export interface SortAndFilterProps {
  activeTab: SortAndFilterTab;
  sort: StakePoolSortOptions;
  filter: FilterValues;
  onSortChange: (value: StakePoolSortOptions) => void;
  onFilterChange: (filters: FilterValues) => void;
  onTabChange: (section: SortAndFilterTab) => void;
}

// TODO consider moving this kind of responsibility to the parent component
const ON_CHANGE_DEBOUNCE = 400;

export const SortAndFilter = ({
  activeTab,
  filter,
  sort,
  onFilterChange,
  onTabChange,
  onSortChange,
}: SortAndFilterProps) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<FilterValues>(filter);
  const { field: sortBy, order: direction } = sort;

  const debouncedFilterChange = useMemo(() => debounce(onFilterChange, ON_CHANGE_DEBOUNCE), [onFilterChange]);
  const handleFilterChange = useCallback(
    (key: PoolsFilter, optIndex: number, value: string) => {
      const newFilters = {
        ...localFilters,
      };
      newFilters[key][optIndex] = value;
      setLocalFilters(newFilters);
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange, localFilters]
  );

  const handleIconClick = useCallback(() => {
    const newSort: StakePoolSortOptions = {
      field: sortBy,
      order: direction === SortDirection.desc ? SortDirection.asc : SortDirection.desc,
    };
    onSortChange(newSort);
  }, [direction, onSortChange, sortBy]);

  const handleSortChange = useCallback(
    (field: string) =>
      onSortChange({
        field: field as unknown as SortField,
        order: direction,
      }),
    [direction, onSortChange]
  );

  const getFilters = (filterOption: FilterOption) => {
    if (filterOption.type === 'input') {
      return (
        <Flex>
          {(filterOption.opts as string[]).map((opt, idx) => (
            <TextBox
              key={opt}
              containerClassName={cn(
                filterOption.opts.length > 1 && {
                  [styles.textBoxLeft]: idx === 0,
                  [styles.textBoxRight]: idx === filterOption.opts.length - 1,
                }
              )}
              label={opt}
              value={localFilters[filterOption.key][idx]}
              onChange={(e) => handleFilterChange(filterOption.key, idx, e.target.value)}
            />
          ))}
        </Flex>
      );
    }

    const selectedValue =
      (filterOption.opts as SelectOption[]).find((opt) => opt.value === localFilters[filterOption.key][0])?.value ?? '';

    return (
      <SelectGroup
        onValueChange={(value) => handleFilterChange(filterOption.key, 0, value)}
        showArrow
        withOutline
        className={styles.selectGroup}
        placeholder="Select"
        options={filterOption.opts as SelectOption[]}
        selectedValue={selectedValue}
      />
    );
  };

  const sortingOptions: RadioButtonGroupOption[] = useMemo(() => {
    const icon = direction === SortDirection.asc ? SortDirectionAscIcon : SortDirectionDescIcon;
    return [
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.ticker'),
        onIconClick: handleIconClick,
        value: Columns.ticker,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.saturation'),
        onIconClick: handleIconClick,
        value: Columns.saturation,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.ros'),
        onIconClick: handleIconClick,
        value: Columns.apy,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.cost'),
        onIconClick: handleIconClick,
        value: Columns.cost,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.margin'),
        onIconClick: handleIconClick,
        value: Columns.margin,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.blocks'),
        onIconClick: handleIconClick,
        value: Columns.blocks,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.pledge'),
        onIconClick: handleIconClick,
        value: Columns.pledge,
      },
      {
        icon,
        label: t('browsePools.stakePoolTableBrowser.sortByTitle.livestake'),
        onIconClick: handleIconClick,
        value: Columns.liveStake,
      },
    ];
  }, [direction, handleIconClick, t]);

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
        <Text.SubHeading weight="$bold">
          {t('browsePools.stakePoolTableBrowser.sortAndFilter.headers.moreOptions')}
        </Text.SubHeading>
        <ToggleButtonGroup.Root value={activeTab} onValueChange={(value) => onTabChange(value as SortAndFilterTab)}>
          <ToggleButtonGroup.Item value={SortAndFilterTab.sort}>
            {t('browsePools.stakePoolTableBrowser.sortAndFilter.headers.sorting')}
          </ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value={SortAndFilterTab.filter}>
            {t('browsePools.stakePoolTableBrowser.sortAndFilter.headers.filters')}
          </ToggleButtonGroup.Item>
        </ToggleButtonGroup.Root>
        {activeTab === SortAndFilterTab.sort ? (
          <RadioButtonGroup
            className={styles.radioGroup}
            options={sortingOptions}
            selectedValue={sortBy}
            onValueChange={handleSortChange}
          />
        ) : (
          <Flex flexDirection="column" justifyContent="stretch" alignItems="stretch">
            {filterOptions.map((filterOption) => (
              <Flex flexDirection="column" m="$4" key={filterOption.title} alignItems="stretch">
                <Text.Body.Small weight="$medium">{filterOption.title}</Text.Body.Small>
                {getFilters(filterOption)}
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Card.Outlined>
  );
};
